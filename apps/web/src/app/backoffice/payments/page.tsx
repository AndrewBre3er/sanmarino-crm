import Link from "next/link";
import { EmptyState } from "../../../components/states/empty-state";
import { ErrorState } from "../../../components/states/error-state";
import { PageHeader, PageSection, PageShell } from "../../../components/shell/page-shell";
import { StatusBadge } from "../../../components/ui/status-badge";
import { require_current_session } from "../../../lib/auth/server-auth";
import { fetch_payment_detail, fetch_payments_list } from "../../../lib/payments/payments-api";
import { payment_methods, payment_statuses } from "../../../lib/payments/payments-contract";

interface PaymentsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function resolve_query_value(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (Array.isArray(value)) {
    const firstValue = value.find((item) => item.length > 0);
    return firstValue;
  }

  return undefined;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const session = await require_current_session();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedPaymentId = resolve_query_value(resolvedSearchParams.paymentId);

  const [paymentsResult, paymentDetailResult] = await Promise.all([
    fetch_payments_list(),
    selectedPaymentId
      ? fetch_payment_detail(selectedPaymentId)
      : Promise.resolve({ data: null, error: null })
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Payments"
        subtitle="Payments baseline (read-first)"
        note="Source: backend GET /payments and GET /payments/:paymentId. Backend role/object scope remains authoritative."
        rightSlot={
          <span className="bo-workspace-chip bo-workspace-chip-active">
            {session.user.primaryRole}
          </span>
        }
      />

      <PageSection title="Status Context" description="Payment statuses from accepted API contract.">
        <div className="bo-badge-row">
          {payment_statuses.map((status) => (
            <StatusBadge key={status} label={status} />
          ))}
        </div>
      </PageSection>

      <PageSection title="Method Context" description="Payment methods currently accepted by backend.">
        <div className="bo-badge-row">
          {payment_methods.map((method) => (
            <span key={method} className="bo-workspace-chip">
              {method}
            </span>
          ))}
        </div>
      </PageSection>

      <PageSection title="Payments List" description="Minimal list wired to backend GET /payments.">
        {paymentsResult.error ? (
          <ErrorState title="Payments request failed" message={paymentsResult.error} />
        ) : paymentsResult.data.length === 0 ? (
          <EmptyState
            title="No payments returned"
            description="Backend returned an empty list for GET /payments."
          />
        ) : (
          <>
            {paymentsResult.pagination ? (
              <p className="bo-muted">
                Total: {paymentsResult.pagination.totalItems}, page {paymentsResult.pagination.page} of{" "}
                {paymentsResult.pagination.totalPages}
              </p>
            ) : null}
            <ul className="bo-list-grid">
              {paymentsResult.data.map((payment) => (
                <li
                  key={payment.id}
                  className={
                    selectedPaymentId === payment.id ? "bo-crm-item bo-crm-item-selected" : "bo-crm-item"
                  }
                >
                  <strong>{payment.paymentNumber}</strong>
                  <p className="bo-muted">ID: {payment.id}</p>
                  <p className="bo-muted">Order: {payment.orderId}</p>
                  <div className="bo-crm-row">
                    <span className="bo-muted">Status:</span>
                    <StatusBadge label={payment.status} />
                  </div>
                  <p className="bo-muted">Method: {payment.paymentMethod}</p>
                  <p className="bo-muted">
                    Source: {payment.externalSource} / {payment.externalEventId}
                  </p>
                  <p className="bo-muted">
                    Amount: {payment.amount} | Refunded: {payment.refundedAmount}
                  </p>
                  <p className="bo-muted">Intaked at: {payment.intakedAt}</p>
                  <p className="bo-muted">Received at: {payment.receivedAt ?? "not completed yet"}</p>
                  <p className="bo-muted">Rejected at: {payment.rejectedAt ?? "not rejected"}</p>
                  <p className="bo-muted">
                    External reference: {payment.externalReference ?? "not provided"}
                  </p>
                  <div className="bo-crm-actions">
                    <Link
                      className="bo-crm-link"
                      href={`/backoffice/payments?paymentId=${encodeURIComponent(payment.id)}`}
                    >
                      Open detail
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </PageSection>

      <PageSection
        title="Payment Detail"
        description="Read-only detail from GET /payments/:paymentId."
      >
        {!selectedPaymentId ? (
          <EmptyState
            title="Select a payment"
            description="Use Open detail in the list to load payment detail from backend."
          />
        ) : paymentDetailResult.error ? (
          <ErrorState title="Payment detail request failed" message={paymentDetailResult.error} />
        ) : !paymentDetailResult.data ? (
          <EmptyState
            title="Payment not found"
            description="Selected payment was not returned by backend."
          />
        ) : (
          <div className="bo-crm-detail-grid">
            <article className="bo-crm-detail-item">
              <strong>ID / Number</strong>
              <p className="bo-muted">
                {paymentDetailResult.data.id} / {paymentDetailResult.data.paymentNumber}
              </p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Status</strong>
              <div className="bo-crm-row">
                <StatusBadge label={paymentDetailResult.data.status} />
              </div>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Order Linkage</strong>
              <p className="bo-muted">{paymentDetailResult.data.orderId}</p>
              <Link
                className="bo-crm-link"
                href={`/backoffice/orders?orderId=${encodeURIComponent(paymentDetailResult.data.orderId)}`}
              >
                Open order detail
              </Link>
            </article>
            <article className="bo-crm-detail-item">
              <strong>External Fact</strong>
              <p className="bo-muted">Source type: {paymentDetailResult.data.sourceType}</p>
              <p className="bo-muted">Source: {paymentDetailResult.data.externalSource}</p>
              <p className="bo-muted">Event: {paymentDetailResult.data.externalEventId}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>External Reference</strong>
              <p className="bo-muted">{paymentDetailResult.data.externalReference ?? "not provided"}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Control Timestamps</strong>
              <p className="bo-muted">Intaked: {paymentDetailResult.data.intakedAt}</p>
              <p className="bo-muted">{paymentDetailResult.data.receivedAt ?? "not completed yet"}</p>
              <p className="bo-muted">Confirmed by: {paymentDetailResult.data.confirmedBy ?? "not confirmed"}</p>
              <p className="bo-muted">Confirmed at: {paymentDetailResult.data.confirmedAt ?? "not confirmed"}</p>
              <p className="bo-muted">Rejected at: {paymentDetailResult.data.rejectedAt ?? "not rejected"}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Method / Amount</strong>
              <p className="bo-muted">Method: {paymentDetailResult.data.paymentMethod}</p>
              <p className="bo-muted">Amount: {paymentDetailResult.data.amount}</p>
              <p className="bo-muted">Refunded: {paymentDetailResult.data.refundedAmount}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Money-Control Related Context</strong>
              <p className="bo-muted">
                Current payment read-model exposes order linkage only. Dedicated money-control fields are
                not returned by GET /payments.
              </p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Updated</strong>
              <p className="bo-muted">
                Created: {paymentDetailResult.data.createdAt}
              </p>
              <p className="bo-muted">
                Updated: {paymentDetailResult.data.updatedAt}
              </p>
            </article>
          </div>
        )}
      </PageSection>

      <PageSection
        title="Deferred Commands"
        description="This step is read-first and does not add command UI."
      >
        <p className="bo-muted">
          Payment intake/confirm/reject/refund actions remain backend-only. This page intentionally does not
          provide command controls.
        </p>
      </PageSection>
    </PageShell>
  );
}
