import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { Button, Card, Col, Input, List, Row, Select, Space, Tag, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { approveRequest, getRequestById, getRequests, rejectRequest } from "../../api";
import { useAuth } from "../../features/auth/AuthContext";
import type { OrganizationRequest, RequestDetails, RequestStatus } from "../../types";
import { getErrorMessage } from "../../shared/errors";

const statuses: Array<RequestStatus | "ALL"> = ["ALL", "PENDING", "APPROVED", "REJECTED", "FAILED"];
const statusLabels: Record<RequestStatus | "ALL", string> = {
  ALL: "Все",
  PENDING: "В ожидании",
  APPROVED: "Одобрена",
  REJECTED: "Отклонена",
  FAILED: "Ошибка"
};
const organizationTypeLabels: Record<"Company" | "Individual" | "Other", string> = {
  Company: "Компания",
  Individual: "ИП",
  Other: "Другое"
};

export function StaffRequestsPage() {
  const { token, role } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();

  const [requestFilter, setRequestFilter] = useState<RequestStatus | "ALL">("ALL");
  const [requests, setRequests] = useState<OrganizationRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedRequest = useMemo(
    () => requests.find((item) => item.id === selectedRequestId) ?? null,
    [requests, selectedRequestId]
  );

  async function loadRequests(filter: RequestStatus | "ALL") {
    if (!token) return;

    setLoading(true);
    try {
      const data = await getRequests(token, filter);
      setRequests(data.items);
      setSelectedRequestId((prev) => {
        if (data.items.some((item) => item.id === prev)) {
          return prev;
        }
        return data.items[0]?.id ?? "";
      });
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function loadRequestDetails(requestId: string) {
    if (!token || !requestId) {
      setRequestDetails(null);
      return;
    }

    try {
      const data = await getRequestById(token, requestId);
      setRequestDetails(data);
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error));
    }
  }

  useEffect(() => {
    loadRequests(requestFilter);
  }, [token, requestFilter]);

  useEffect(() => {
    loadRequestDetails(selectedRequestId);
  }, [token, selectedRequestId]);

  async function handleApprove() {
    if (!token || !selectedRequest) return;

    try {
      await approveRequest(token, selectedRequest.id);
      messageApi.success("Заявка одобрена");
      await loadRequests(requestFilter);
      await loadRequestDetails(selectedRequest.id);
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error));
    }
  }

  async function handleReject() {
    if (!token || !selectedRequest) return;
    if (!rejectComment.trim()) {
      messageApi.error("Укажите причину отклонения");
      return;
    }

    try {
      await rejectRequest(token, selectedRequest.id, rejectComment.trim());
      setRejectComment("");
      messageApi.success("Заявка отклонена");
      await loadRequests(requestFilter);
      await loadRequestDetails(selectedRequest.id);
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error));
    }
  }

  return (
    <div className="staff-page">
      {contextHolder}
      <Row gutter={16}>
        <Col xs={24} lg={9}>
          <Card
            title="Заявки"
            extra={
              <Select
                value={requestFilter}
                style={{ width: 150 }}
                onChange={(value) => setRequestFilter(value)}
                options={statuses.map((status) => ({ value: status, label: statusLabels[status] }))}
              />
            }
          >
            <List
              loading={loading}
              dataSource={requests}
              renderItem={(item) => (
                <List.Item
                  onClick={() => setSelectedRequestId(item.id)}
                  className={item.id === selectedRequestId ? "selected-list-item" : ""}
                >
                  <List.Item.Meta
                    title={item.organization_name}
                    description={
                      <Space direction="vertical" size={0}>
                        <Typography.Text type="secondary">{new Date(item.created_at).toLocaleString()}</Typography.Text>
                        <Tag>{statusLabels[item.status]}</Tag>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={15}>
          <Card title={requestDetails?.request.organization_name ?? "Детали заявки"}>
            {!requestDetails && <Typography.Text type="secondary">Выберите заявку</Typography.Text>}
            {requestDetails && (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Row gutter={12}>
                  <Col span={12}>Тип: {organizationTypeLabels[requestDetails.request.organization_type]}</Col>
                  <Col span={12}>INN: {requestDetails.request.inn ?? "-"}</Col>
                  <Col span={12}>OGRN: {requestDetails.request.ogrn ?? "-"}</Col>
                  <Col span={12}>Email: {requestDetails.request.email ?? "-"}</Col>
                  <Col span={12}>Заявитель: {requestDetails.request.requested_by_email}</Col>
                  <Col span={12}>Статус: {statusLabels[requestDetails.request.status]}</Col>
                </Row>

                {requestDetails.request.status === "PENDING" && role !== "reviewer" && (
                  <Space wrap>
                    <Button type="primary" icon={<CheckOutlined />} onClick={handleApprove}>
                      Одобрить
                    </Button>
                    <Input
                      style={{ width: 280 }}
                      placeholder="Причина отклонения"
                      value={rejectComment}
                      onChange={(event) => setRejectComment(event.target.value)}
                    />
                    <Button danger icon={<CloseOutlined />} onClick={handleReject}>
                      Отклонить
                    </Button>
                  </Space>
                )}

                <Typography.Title level={5}>События</Typography.Title>
                <List
                  dataSource={requestDetails.events}
                  renderItem={(event) => (
                    <List.Item>
                      <List.Item.Meta
                        title={`${event.event_type} - ${new Date(event.created_at).toLocaleString()}`}
                        description={event.message}
                      />
                    </List.Item>
                  )}
                />
              </Space>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

