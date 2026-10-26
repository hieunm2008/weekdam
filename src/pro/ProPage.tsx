import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { usePlanner } from "../usePlanner";
import type { useBilling } from "./useBilling";
import { createCheckoutId, type DemoPlan, type DemoOutcome } from "./billing";
import { Modal } from "../components/Modal";
import { addDemoStudyData } from "./demoData";
import { parseBackup, type Plan } from "../domain";
import "./pro.css";
const ExamTool = lazy(() => import("./ExamTool"));
const RecurrenceTool = lazy(() => import("./RecurrenceTool"));
const TemplatesTool = lazy(() => import("./TemplatesTool"));
const ReportsTool = lazy(() => import("./ReportsTool"));
const RemindersTool = lazy(() => import("./RemindersTool"));
type Tool =
  "billing" | "exam" | "recurrence" | "templates" | "reports" | "reminders";
type Pending = Exclude<Tool, "billing"> | "trial" | "checkout";

export default function ProPage({
  store,
  billing,
  start,
}: {
  store: ReturnType<typeof usePlanner>;
  billing: ReturnType<typeof useBilling>;
  start: string;
}) {
  const { i18n } = useTranslation(),
    en = i18n.language.startsWith("en");
  const [tool, setTool] = useState<Tool>("billing"),
    [period, setPeriod] = useState<DemoPlan>(() =>
      new URLSearchParams(location.search).get("plan") === "year"
        ? "year"
        : "month",
    );
  const [checkout, setCheckout] = useState(false),
    [checkoutId, setCheckoutId] = useState(createCheckoutId),
    [pending, setPending] = useState<Pending | null>(null),
    [message, setMessage] = useState("");
  const [visited, setVisited] = useState<Tool[]>([]),
    [toolEpoch, setToolEpoch] = useState(0);
  const pendingElement = useRef<HTMLElement | null>(null);
  const pendingOwner = useRef<string | null>(null);
  const lastUid = useRef(store.profile?.uid ?? ""),
    currentUid = useRef(store.profile?.uid ?? "");
  currentUid.current = store.profile?.uid ?? "";
  useEffect(() => {
    const next = store.profile?.uid ?? "";
    if (lastUid.current && next !== lastUid.current) {
      pendingOwner.current = null;
      pendingElement.current = null;
      setPending(null);
      setCheckout(false);
      setMessage("");
      setTool("billing");
      setVisited([]);
      setToolEpoch((n) => n + 1);
      setCheckoutId(createCheckoutId());
    }
    lastUid.current = next;
  }, [store.profile?.uid]);
  useEffect(() => {
    if (
      !pending ||
      !store.profile ||
      !store.ready ||
      store.mergeRequest ||
      billing.status === "checking"
    )
      return;
    if (
      pendingOwner.current === null ||
      (pendingOwner.current !== "" &&
        pendingOwner.current !== store.profile.uid)
    )
      return;
    pendingOwner.current = store.profile.uid;
    if (pending === "trial") {
      setPending(null);
      void billing.startTrial().then((ok) => {
        if (ok)
          setMessage(
            en
              ? "Your 7-day trial is active."
              : "Đã kích hoạt dùng thử 7 ngày.",
          );
      });
    } else if (pending === "checkout") {
      setPending(null);
      setCheckout(true);
      setCheckoutId(createCheckoutId());
    } else if (billing.isPro) {
      setTool(pending);
      setVisited((v) => (v.includes(pending) ? v : [...v, pending]));
      setPending(null);
      setMessage("");
      const element = pendingElement.current,
        uid = store.profile.uid;
      pendingElement.current = null;
      pendingOwner.current = null;
      requestAnimationFrame(() => {
        if (
          currentUid.current !== uid ||
          !element?.isConnected ||
          !billing.canUsePro()
        )
          return;
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement
        )
          element.closest("form")?.requestSubmit();
        else element.click();
      });
    }
  }, [
    pending,
    store.profile,
    store.ready,
    store.mergeRequest,
    billing.status,
    billing.isPro,
    billing.startTrial,
    en,
  ]);
  const need = (action: Pending) => {
    pendingOwner.current = store.profile?.uid ?? "";
    if (
      action !== "trial" &&
      action !== "checkout" &&
      document.activeElement instanceof HTMLElement &&
      document.activeElement.closest("[data-pro-tool], [data-pro-intent]")
    )
      pendingElement.current = document.activeElement;
    setPending(action);
    setTool("billing");
    setMessage(
      en
        ? "Sign in with Google, then start your trial or simulate an upgrade to continue."
        : "Đăng nhập Google, sau đó dùng thử hoặc nâng cấp mô phỏng để tiếp tục.",
    );
    if (!store.profile && store.loginReady) store.login(i18n.language);
  };
  const apply = (next: Plan, requiresPro = true) => {
    if (!store.ready || store.mergeRequest) throw new Error("account-loading");
    if ((store.profile?.uid ?? "") !== currentUid.current)
      throw new Error("account-changed");
    if (requiresPro && !billing.canUsePro()) {
      need(tool === "billing" ? "templates" : tool);
      throw new Error("pro-required");
    }
    try {
      store.commit(parseBackup(JSON.stringify(next)));
      setMessage(
        en
          ? "Saved. Undo is available in the planner toolbar."
          : "Đã lưu. Có thể Hoàn tác trên thanh công cụ kế hoạch.",
      );
    } catch {
      setMessage(
        en
          ? "Invalid plan data. Please check the inputs."
          : "Dữ liệu kế hoạch không hợp lệ. Hãy kiểm tra đầu vào.",
      );
      throw new Error("invalid-plan");
    }
  };
  const labels: Record<Tool, string> = en
    ? {
        billing: "Manage plan",
        exam: "Automatic exam planning",
        recurrence: "Recurring classes",
        templates: "Plan templates",
        reports: "Study reports",
        reminders: "Deadline reminders",
      }
    : {
        billing: "Quản lý gói",
        exam: "Ôn thi tự động",
        recurrence: "Lịch học lặp lại",
        templates: "Mẫu kế hoạch",
        reports: "Báo cáo học tập",
        reminders: "Nhắc deadline",
      };
  const statusLabels: Record<string, string> = en
    ? {
        guest: "Guest",
        checking: "Checking subscription…",
        free: "Free",
        trial: "7-day trial",
        pro: "Pro active",
        expired: "Pro expired",
        error: "Could not check subscription",
      }
    : {
        guest: "Khách",
        checking: "Đang kiểm tra gói…",
        free: "Free",
        trial: "Dùng thử 7 ngày",
        pro: "Pro còn hạn",
        expired: "Pro đã hết hạn",
        error: "Chưa kiểm tra được gói",
      };
  const formatTime = (ts: number) =>
    new Intl.DateTimeFormat(en ? "en-GB" : "vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(ts);
  const performCheckout = async (outcome: DemoOutcome) => {
    const uid = currentUid.current;
    const receipt = await billing.checkout(period, outcome, checkoutId);
    if (!receipt || currentUid.current !== uid || receipt.uid !== uid) return;
    setCheckout(false);
    setCheckoutId(createCheckoutId());
    setMessage(
      receipt.outcome === "success"
        ? en
          ? "Pro activation confirmed by Firestore."
          : "Firestore đã xác nhận kích hoạt Pro."
        : receipt.outcome === "failed"
          ? en
            ? "Simulated payment failed. Your plan was not extended."
            : "Thanh toán mô phỏng thất bại. Gói chưa được gia hạn."
          : en
            ? "Simulated checkout cancelled."
            : "Đã hủy thanh toán mô phỏng.",
    );
  };
  return (
    <div className="pro-workspace">
      <section className="pro-intro">
        <div>
          <h2>weekdam Pro</h2>
          <p className="muted">
            {en
              ? "From a crowded syllabus to a week you can follow. Five personal study tools."
              : "Từ nội dung ôn tập dày đặc đến một tuần có thể thực hiện. Năm công cụ học tập cá nhân."}
          </p>
        </div>
        <span className="pro-tag" role="status">
          {statusLabels[billing.status]}
        </span>
      </section>
      <nav className="pro-tabs" aria-label={en ? "Pro tools" : "Công cụ Pro"}>
        {(Object.keys(labels) as Tool[]).map((key) => (
          <button
            key={key}
            aria-pressed={tool === key}
            onClick={() => {
              setTool(key);
              if (key !== "billing")
                setVisited((v) => (v.includes(key) ? v : [...v, key]));
              setPending(null);
              pendingElement.current = null;
              setMessage("");
            }}
          >
            {labels[key]}
          </button>
        ))}
      </nav>
      {message ? (
        <p role="status" className="warning">
          {message}
        </p>
      ) : null}
      {billing.error ? (
        <p className="pro-error" role="alert">
          {en
            ? "The billing request could not be confirmed. Check your connection and retry."
            : "Chưa xác nhận được yêu cầu gói. Kiểm tra kết nối và thử lại."}{" "}
          <button className="secondary" onClick={billing.refresh}>
            {en ? "Check again" : "Kiểm tra lại"}
          </button>
        </p>
      ) : null}
      <div hidden={tool !== "billing"}>
        <section className="pro-panel">
          <h2>{labels.billing}</h2>
          <p>
            {store.profile?.name ||
              (en
                ? "Sign in with Google to start your one-time trial or upgrade."
                : "Đăng nhập Google trước khi dùng thử hoặc nâng cấp.")}
          </p>
          <p>
            {en ? "Status" : "Trạng thái"}:{" "}
            <strong>{statusLabels[billing.status]}</strong>
          </p>
          {billing.billing?.expiresAt ? (
            <p>
              {en ? "Expires" : "Hết hạn"}:{" "}
              {formatTime(billing.billing.expiresAt)}
            </p>
          ) : null}
          <p className="muted">
            {en
              ? "No automatic renewal. Billing is separate from backups and Undo. Existing work stays editable after expiry."
              : "Không tự gia hạn. Dữ liệu gói tách khỏi backup và Undo. Dữ liệu đã tạo vẫn chỉnh sửa được sau khi hết hạn."}
          </p>
          {!billing.online ? (
            <p className="warning">
              {en
                ? "Offline. An active cached plan for this account can be used; upgrades require internet."
                : "Đang offline. Có thể dùng gói còn hạn đã cache của đúng tài khoản; nâng cấp cần có mạng."}
            </p>
          ) : null}
          <div className="pro-tabs">
            <button
              aria-pressed={period === "month"}
              onClick={() => setPeriod("month")}
            >
              {en ? "Monthly" : "Theo tháng"} · 29.000đ
            </button>
            <button
              aria-pressed={period === "year"}
              onClick={() => setPeriod("year")}
            >
              {en ? "Yearly" : "Theo năm"} · 249.000đ
            </button>
          </div>
          <div className="pro-actions">
            {!store.profile ? (
              <button
                className="primary"
                disabled={!store.loginReady}
                onClick={() => need(pending ?? "trial")}
              >
                {en ? "Continue with Google" : "Tiếp tục với Google"}
              </button>
            ) : null}
            <button
              className="secondary"
              disabled={
                billing.busy ||
                !billing.online ||
                !!billing.billing?.trialUsed ||
                billing.isPro ||
                billing.status === "checking"
              }
              onClick={() => {
                if (!store.profile) {
                  need("trial");
                  return;
                }
                void billing.startTrial().then((ok) => {
                  if (ok)
                    setMessage(
                      en
                        ? "Your 7-day trial is active."
                        : "Đã kích hoạt dùng thử 7 ngày.",
                    );
                });
              }}
            >
              {en ? "Try Pro for 7 days" : "Dùng thử Pro 7 ngày"}
            </button>
            <button
              className="primary"
              disabled={
                billing.busy || !billing.online || billing.status === "checking"
              }
              onClick={() => {
                if (!store.profile) {
                  need("checkout");
                  return;
                }
                setCheckoutId(createCheckoutId());
                setCheckout(true);
              }}
            >
              {billing.isPro || billing.status === "expired"
                ? en
                  ? "Renew (simulation)"
                  : "Gia hạn mô phỏng"
                : en
                  ? "Upgrade (simulation)"
                  : "Nâng cấp mô phỏng"}
            </button>
          </div>
          {!store.configured ? (
            <p className="warning">
              {en
                ? "Firebase is not configured. Run the Auth and Firestore Emulators using the demo guide."
                : "Chưa cấu hình Firebase. Chạy Auth và Firestore Emulator theo hướng dẫn demo."}
            </p>
          ) : null}
          <p className="pro-hint">
            {en
              ? "Research prices: 29,000 VND/month, 249,000 VND/year. A business hypothesis for this project."
              : "Giá khảo sát: 29.000đ/tháng, 249.000đ/năm. Đây là giả thuyết kinh doanh của đồ án."}
          </p>
        </section>
        <section className="pro-panel">
          <h3>
            {en
              ? "Simulated transaction history"
              : "Lịch sử giao dịch mô phỏng"}
          </h3>
          {!billing.receipts.length ? (
            <p className="muted">
              {en ? "No transactions yet." : "Chưa có giao dịch."}
            </p>
          ) : (
            <div className="pro-table-wrap">
              <table className="pro-table">
                <thead>
                  <tr>
                    <th>{en ? "Date" : "Thời điểm"}</th>
                    <th>{en ? "Type" : "Loại"}</th>
                    <th>{en ? "Result" : "Kết quả"}</th>
                    <th>{en ? "ID" : "Mã giao dịch"}</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.receipts.map((r) => (
                    <tr key={r.checkoutId}>
                      <td>{formatTime(r.createdAt)}</td>
                      <td>
                        {r.kind === "trial"
                          ? en
                            ? "Trial"
                            : "Dùng thử"
                          : r.plan === "month"
                            ? en
                              ? "Monthly"
                              : "Tháng"
                            : en
                              ? "Yearly"
                              : "Năm"}
                      </td>
                      <td>
                        {r.outcome === "success"
                          ? en
                            ? "Success"
                            : "Thành công"
                          : r.outcome === "failed"
                            ? en
                              ? "Failed"
                              : "Thất bại"
                            : en
                              ? "Cancelled"
                              : "Đã hủy"}
                      </td>
                      <td style={{ overflowWrap: "anywhere" }}>
                        {r.checkoutId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="pro-panel">
          <h3>{en ? "Try the demo story" : "Thử hành trình demo"}</h3>
          <p className="muted">
            {en
              ? "Add an IELTS plan, a deadline and a stopped Pomodoro session to your current account. This adds sample data only when you click."
              : "Thêm kế hoạch IELTS, deadline và một phiên Pomodoro dừng sớm vào tài khoản hiện tại. Chỉ thêm dữ liệu mẫu khi bạn bấm nút."}
          </p>
          <button
            data-pro-intent="demo"
            className="secondary"
            onClick={() => {
              if (!billing.canUsePro()) {
                need("reports");
                return;
              }
              apply(addDemoStudyData(store.plan));
            }}
          >
            {en ? "Add demo data" : "Thêm dữ liệu demo"}
          </button>
        </section>
      </div>
      {visited.map((view) => (
        <div
          key={`${toolEpoch}-${view}`}
          data-pro-tool={view}
          hidden={tool !== view}
        >
          <Suspense
            fallback={
              <p role="status">{en ? "Loading tool…" : "Đang tải công cụ…"}</p>
            }
          >
            {view === "exam" ? (
              <ExamTool
                plan={store.plan}
                allowed={billing.isPro}
                canUsePro={billing.canUsePro}
                onRequire={() => need("exam")}
                onApply={apply}
              />
            ) : view === "recurrence" ? (
              <RecurrenceTool
                plan={store.plan}
                allowed={billing.isPro}
                canUsePro={billing.canUsePro}
                onRequire={() => need("recurrence")}
                onApply={apply}
              />
            ) : view === "templates" ? (
              <TemplatesTool
                plan={store.plan}
                start={start}
                allowed={billing.isPro}
                canUsePro={billing.canUsePro}
                onRequire={() => need("templates")}
                onApply={apply}
              />
            ) : view === "reports" ? (
              <ReportsTool
                plan={store.plan}
                allowed={billing.isPro}
                canUsePro={billing.canUsePro}
                onRequire={() => need("reports")}
              />
            ) : (
              <RemindersTool
                plan={store.plan}
                allowed={billing.isPro}
                canUsePro={billing.canUsePro}
                onRequire={() => need("reminders")}
                onChange={(settings) =>
                  apply({
                    ...store.plan,
                    pro: { ...store.plan.pro, reminders: settings },
                  })
                }
              />
            )}
          </Suspense>
        </div>
      ))}
      {checkout ? (
        <Modal
          title={
            en
              ? "Simulated payment — no money charged"
              : "Thanh toán mô phỏng — không thu tiền"
          }
          onClose={() => {
            if (!billing.busy) setCheckout(false);
          }}
        >
          <p>
            {period === "month"
              ? "29.000đ / " + (en ? "month" : "tháng")
              : "249.000đ / " + (en ? "year" : "năm")}
          </p>
          <p className="warning">
            {en
              ? "Demo only. Choose an outcome. No card or bank details are collected. Activation requires Firestore confirmation."
              : "Chỉ dùng để demo. Chọn kết quả bên dưới. Không thu thập thông tin thẻ/ngân hàng. Chỉ kích hoạt sau khi Firestore xác nhận lưu."}
          </p>
          <p className="pro-hint">
            {en ? "Transaction" : "Giao dịch"}: {checkoutId}
          </p>
          <div className="pro-actions">
            <button
              className="primary"
              disabled={billing.busy || !billing.online}
              onClick={() => void performCheckout("success")}
            >
              {billing.busy
                ? en
                  ? "Confirming…"
                  : "Đang xác nhận…"
                : en
                  ? "Simulate success"
                  : "Mô phỏng thành công"}
            </button>
            <button
              className="secondary"
              disabled={billing.busy || !billing.online}
              onClick={() => void performCheckout("failed")}
            >
              {en ? "Simulate failure" : "Mô phỏng thất bại"}
            </button>
            <button
              className="secondary"
              disabled={billing.busy || !billing.online}
              onClick={() => void performCheckout("cancelled")}
            >
              {en ? "Simulate cancellation" : "Mô phỏng hủy"}
            </button>
          </div>
          {billing.error ? (
            <p role="alert" className="pro-error">
              {en
                ? "Not confirmed. Retry the same transaction when online."
                : "Chưa xác nhận. Thử lại cùng giao dịch khi có mạng."}
            </p>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}
