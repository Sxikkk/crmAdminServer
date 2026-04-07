import { Button, Card, Input, Select, Space, Table, Tag, message } from "antd";
import { useEffect, useState } from "react";
import { getOrganizations, updateOrganizationStatus, updateOrganizationType } from "../../api";
import { useAuth } from "../../features/auth/AuthContext";
import { getErrorMessage } from "../../shared/errors";
import type { MainOrganization, OrganizationStatus, OrganizationType } from "../../types";

const organizationTypes: OrganizationType[] = ["Company", "Individual", "Other"];
const organizationStatuses: OrganizationStatus[] = ["Active", "Blocked"];
const organizationTypeLabels: Record<OrganizationType, string> = {
  Company: "Компания",
  Individual: "ИП",
  Other: "Другое"
};
const organizationStatusLabels: Record<OrganizationStatus, string> = {
  Active: "Активна",
  Blocked: "Заблокирована"
};

export function StaffOrganizationsPage() {
  const { token } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<MainOrganization[]>([]);

  async function loadOrganizations(nextSearch = "") {
    if (!token) return;

    setLoading(true);
    try {
      const data = await getOrganizations(token, nextSearch);
      setItems(data.items);
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function changeType(item: MainOrganization, nextType: OrganizationType) {
    if (!token) return;

    try {
      await updateOrganizationType(token, item.id, nextType);
      await loadOrganizations(search);
      messageApi.success("Тип обновлён");
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error));
    }
  }

  async function changeStatus(item: MainOrganization, nextStatus: OrganizationStatus) {
    if (!token) return;

    try {
      await updateOrganizationStatus(token, item.id, nextStatus);
      await loadOrganizations(search);
      messageApi.success("Статус обновлён");
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error));
    }
  }

  useEffect(() => {
    loadOrganizations();
  }, [token]);

  return (
    <div className="staff-page">
      {contextHolder}
      <Card
        title="Организации"
        extra={
          <Space>
            <Input.Search
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onSearch={(value) => loadOrganizations(value)}
              placeholder="Поиск по названию / INN / OGRN"
              allowClear
            />
            <Button onClick={() => loadOrganizations(search)}>Обновить</Button>
          </Space>
        }
      >
        <Table<MainOrganization>
          rowKey="id"
          loading={loading}
          dataSource={items}
          pagination={{ pageSize: 15 }}
          columns={[
            { title: "Название", dataIndex: "name", key: "name" },
            { title: "INN", dataIndex: "inn", key: "inn", render: (value: string | null) => value ?? "-" },
            { title: "OGRN", dataIndex: "ogrn", key: "ogrn", render: (value: string | null) => value ?? "-" },
            {
              title: "Тип",
              key: "type",
              render: (_, item) => (
                <Select
                  value={item.type}
                  style={{ width: 130 }}
                  options={organizationTypes.map((type) => ({ value: type, label: organizationTypeLabels[type] }))}
                  onChange={(nextType) => changeType(item, nextType)}
                />
              )
            },
            {
              title: "Статус",
              key: "status",
              render: (_, item) => (
                <Space>
                  <Tag color={item.status === "Active" ? "green" : "volcano"}>{organizationStatusLabels[item.status]}</Tag>
                  <Select
                    value={item.status}
                    style={{ width: 130 }}
                    options={organizationStatuses.map((status) => ({ value: status, label: organizationStatusLabels[status] }))}
                    onChange={(nextStatus) => changeStatus(item, nextStatus)}
                  />
                </Space>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
}
