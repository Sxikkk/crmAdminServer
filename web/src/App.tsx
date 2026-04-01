import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  approveRequest,
  createRequest,
  getOrganizations,
  getRequestById,
  getRequests,
  login,
  rejectRequest,
  updateOrganizationStatus,
  updateOrganizationType
} from "./api";
import { clearToken, getToken, setToken } from "./auth";
import type {
  MainOrganization,
  OrganizationRequest,
  OrganizationStatus,
  OrganizationType,
  RequestDetails,
  RequestStatus
} from "./types";

type StaffTab = "requests" | "organizations";

const organizationTypes: OrganizationType[] = ["Company", "Individual", "Other"];
const statuses: RequestStatus[] = ["PENDING", "APPROVED", "REJECTED", "FAILED"];
const organizationStatuses: OrganizationStatus[] = ["Active", "Blocked"];

export default function App() {
  const [mode, setMode] = useState<"public" | "staff">("public");
  const [token, setTokenState] = useState<string | null>(getToken());
  const [error, setError] = useState<string>("");
  const [notice, setNotice] = useState<string>("");

  const [staffTab, setStaffTab] = useState<StaffTab>("requests");
  const [requestFilter, setRequestFilter] = useState<RequestStatus | "ALL">("ALL");
  const [requests, setRequests] = useState<OrganizationRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);

  const [organizations, setOrganizations] = useState<MainOrganization[]>([]);
  const [orgSearch, setOrgSearch] = useState<string>("");

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [rejectComment, setRejectComment] = useState("");

  const [publicForm, setPublicForm] = useState({
    organizationName: "",
    organizationType: "Company" as OrganizationType,
    inn: "",
    ogrn: "",
    email: "",
    phone: "",
    website: "",
    city: "",
    requestedByEmail: ""
  });

  async function loadRequests(currentToken: string, filter: RequestStatus | "ALL"): Promise<void> {
    const data = await getRequests(currentToken, filter);
    setRequests(data.items);
    if (data.items.length > 0 && !selectedRequestId) {
      setSelectedRequestId(data.items[0].id);
    }
  }

  async function loadOrganizations(currentToken: string, search = ""): Promise<void> {
    const data = await getOrganizations(currentToken, search);
    setOrganizations(data.items);
  }

  useEffect(() => {
    if (!token) {
      return;
    }
    loadRequests(token, requestFilter).catch((e: unknown) => setError(String(e)));
    loadOrganizations(token, orgSearch).catch((e: unknown) => setError(String(e)));
  }, [token]);

  useEffect(() => {
    if (!token || !selectedRequestId) {
      setRequestDetails(null);
      return;
    }
    getRequestById(token, selectedRequestId)
      .then(setRequestDetails)
      .catch((e: unknown) => setError(String(e)));
  }, [token, selectedRequestId]);

  const selectedRequest = useMemo(
    () => requests.find((item) => item.id === selectedRequestId) ?? null,
    [requests, selectedRequestId]
  );

  async function handleLoginSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const auth = await login(loginForm.username, loginForm.password);
      setToken(auth.accessToken);
      setTokenState(auth.accessToken);
      setMode("staff");
      setNotice(`Вход выполнен: ${auth.user.username}`);
    } catch (e: unknown) {
      setError(String(e));
    }
  }

  async function handlePublicSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await createRequest({
        organizationName: publicForm.organizationName,
        organizationType: publicForm.organizationType,
        inn: publicForm.inn || undefined,
        ogrn: publicForm.ogrn || undefined,
        email: publicForm.email || undefined,
        phone: publicForm.phone || undefined,
        website: publicForm.website || undefined,
        city: publicForm.city || undefined,
        requestedByEmail: publicForm.requestedByEmail
      });
      setNotice("Заявка создана и отправлена на проверку");
      setPublicForm({
        organizationName: "",
        organizationType: "Company",
        inn: "",
        ogrn: "",
        email: "",
        phone: "",
        website: "",
        city: "",
        requestedByEmail: ""
      });
    } catch (e: unknown) {
      setError(String(e));
    }
  }

  async function handleApprove(): Promise<void> {
    if (!token || !selectedRequest) {
      return;
    }
    setError("");
    setNotice("");
    try {
      await approveRequest(token, selectedRequest.id);
      setNotice("Заявка одобрена");
      await loadRequests(token, requestFilter);
      await getRequestById(token, selectedRequest.id).then(setRequestDetails);
    } catch (e: unknown) {
      setError(String(e));
    }
  }

  async function handleReject(): Promise<void> {
    if (!token || !selectedRequest) {
      return;
    }
    if (!rejectComment.trim()) {
      setError("Введите комментарий отклонения");
      return;
    }

    setError("");
    setNotice("");
    try {
      await rejectRequest(token, selectedRequest.id, rejectComment.trim());
      setRejectComment("");
      setNotice("Заявка отклонена");
      await loadRequests(token, requestFilter);
      await getRequestById(token, selectedRequest.id).then(setRequestDetails);
    } catch (e: unknown) {
      setError(String(e));
    }
  }

  async function changeOrgType(org: MainOrganization, type: OrganizationType): Promise<void> {
    if (!token) return;
    try {
      await updateOrganizationType(token, org.id, type);
      await loadOrganizations(token, orgSearch);
      setNotice(`Тип организации "${org.name}" обновлен`);
    } catch (e: unknown) {
      setError(String(e));
    }
  }

  async function changeOrgStatus(org: MainOrganization, status: OrganizationStatus): Promise<void> {
    if (!token) return;
    try {
      await updateOrganizationStatus(token, org.id, status);
      await loadOrganizations(token, orgSearch);
      setNotice(`Статус организации "${org.name}" обновлен`);
    } catch (e: unknown) {
      setError(String(e));
    }
  }

  return (
    <main className="layout">
      <section className="hero">
        <h1>CRM Admin</h1>
        <p>Модерация заявок и управление организациями в основной CRM.</p>
        <div className="modeSwitch">
          <button className={mode === "public" ? "active" : ""} onClick={() => setMode("public")}>
            Подача заявки
          </button>
          <button className={mode === "staff" ? "active" : ""} onClick={() => setMode("staff")}>
            Кабинет сотрудника
          </button>
        </div>
      </section>

      {error && <div className="banner error">{error}</div>}
      {notice && <div className="banner notice">{notice}</div>}

      {mode === "public" && (
        <section className="panel">
          <h2>Новая заявка на организацию</h2>
          <form className="gridForm" onSubmit={handlePublicSubmit}>
            <input
              placeholder="Название организации"
              value={publicForm.organizationName}
              onChange={(e) => setPublicForm((prev) => ({ ...prev, organizationName: e.target.value }))}
              required
            />
            <select
              value={publicForm.organizationType}
              onChange={(e) => setPublicForm((prev) => ({ ...prev, organizationType: e.target.value as OrganizationType }))}
            >
              {organizationTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <input placeholder="INN" value={publicForm.inn} onChange={(e) => setPublicForm((prev) => ({ ...prev, inn: e.target.value }))} />
            <input
              placeholder="OGRN"
              value={publicForm.ogrn}
              onChange={(e) => setPublicForm((prev) => ({ ...prev, ogrn: e.target.value }))}
            />
            <input
              type="email"
              placeholder="Email организации"
              value={publicForm.email}
              onChange={(e) => setPublicForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <input
              placeholder="Телефон"
              value={publicForm.phone}
              onChange={(e) => setPublicForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
            <input
              placeholder="Сайт"
              value={publicForm.website}
              onChange={(e) => setPublicForm((prev) => ({ ...prev, website: e.target.value }))}
            />
            <input
              placeholder="Город"
              value={publicForm.city}
              onChange={(e) => setPublicForm((prev) => ({ ...prev, city: e.target.value }))}
            />
            <input
              type="email"
              placeholder="Email для уведомлений"
              value={publicForm.requestedByEmail}
              onChange={(e) => setPublicForm((prev) => ({ ...prev, requestedByEmail: e.target.value }))}
              required
            />
            <button type="submit">Отправить заявку</button>
          </form>
        </section>
      )}

      {mode === "staff" && !token && (
        <section className="panel narrow">
          <h2>Вход сотрудника</h2>
          <form className="gridForm" onSubmit={handleLoginSubmit}>
            <input
              placeholder="Username"
              value={loginForm.username}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
              required
            />
            <button type="submit">Войти</button>
          </form>
        </section>
      )}

      {mode === "staff" && token && (
        <section className="panel">
          <div className="row space">
            <h2>Кабинет сотрудника</h2>
            <button
              onClick={() => {
                clearToken();
                setTokenState(null);
                setRequestDetails(null);
                setSelectedRequestId("");
                setNotice("Вы вышли из кабинета");
              }}
            >
              Выйти
            </button>
          </div>

          <div className="modeSwitch">
            <button className={staffTab === "requests" ? "active" : ""} onClick={() => setStaffTab("requests")}>
              Заявки
            </button>
            <button className={staffTab === "organizations" ? "active" : ""} onClick={() => setStaffTab("organizations")}>
              Организации
            </button>
          </div>

          {staffTab === "requests" && (
            <div className="split">
              <aside className="listBlock">
                <div className="row">
                  <label>Статус:</label>
                  <select
                    value={requestFilter}
                    onChange={async (e) => {
                      const next = e.target.value as RequestStatus | "ALL";
                      setRequestFilter(next);
                      if (token) {
                        await loadRequests(token, next);
                      }
                    }}
                  >
                    <option value="ALL">ALL</option>
                    {statuses.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="scroll">
                  {requests.map((item) => (
                    <button
                      key={item.id}
                      className={`listItem ${selectedRequestId === item.id ? "selected" : ""}`}
                      onClick={() => setSelectedRequestId(item.id)}
                    >
                      <strong>{item.organization_name}</strong>
                      <span>{item.status}</span>
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </aside>

              <article className="details">
                {!requestDetails && <p>Выберите заявку</p>}
                {requestDetails && (
                  <>
                    <h3>{requestDetails.request.organization_name}</h3>
                    <div className="infoGrid">
                      <div>Type: {requestDetails.request.organization_type}</div>
                      <div>INN: {requestDetails.request.inn ?? "-"}</div>
                      <div>OGRN: {requestDetails.request.ogrn ?? "-"}</div>
                      <div>Email: {requestDetails.request.email ?? "-"}</div>
                      <div>Requester: {requestDetails.request.requested_by_email}</div>
                      <div>Status: {requestDetails.request.status}</div>
                    </div>

                    {requestDetails.request.status === "PENDING" && (
                      <div className="actions">
                        <button className="ok" onClick={handleApprove}>
                          Одобрить
                        </button>
                        <input
                          placeholder="Причина отклонения"
                          value={rejectComment}
                          onChange={(e) => setRejectComment(e.target.value)}
                        />
                        <button className="danger" onClick={handleReject}>
                          Отклонить
                        </button>
                      </div>
                    )}

                    <h4>История</h4>
                    <div className="timeline">
                      {requestDetails.events.map((event) => (
                        <div key={event.id} className="timelineItem">
                          <strong>{event.event_type}</strong>
                          <span>{event.message}</span>
                          <time>{new Date(event.created_at).toLocaleString()}</time>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </article>
            </div>
          )}

          {staffTab === "organizations" && (
            <div>
              <div className="row">
                <input
                  placeholder="Поиск по названию, INN, OGRN"
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                />
                <button onClick={() => token && loadOrganizations(token, orgSearch)}>Найти</button>
              </div>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>INN</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map((org) => (
                      <tr key={org.id}>
                        <td>{org.name}</td>
                        <td>{org.inn ?? "-"}</td>
                        <td>{org.type}</td>
                        <td>{org.status}</td>
                        <td>
                          <select value={org.type} onChange={(e) => changeOrgType(org, e.target.value as OrganizationType)}>
                            {organizationTypes.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                          <select
                            value={org.status}
                            onChange={(e) => changeOrgStatus(org, e.target.value as OrganizationStatus)}
                          >
                            {organizationStatuses.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
