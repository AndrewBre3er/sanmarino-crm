import Link from "next/link";
import { EmptyState } from "../../../components/states/empty-state";
import { ErrorState } from "../../../components/states/error-state";
import { PageHeader, PageSection, PageShell } from "../../../components/shell/page-shell";
import { StatusBadge } from "../../../components/ui/status-badge";
import { require_current_session } from "../../../lib/auth/server-auth";
import {
  fetch_fulfillments_by_order,
  fetch_order_detail,
  fetch_orders_list
} from "../../../lib/orders/orders-api";
import {
  filter_fulfillments_by_order,
  fulfillment_statuses,
  order_payment_control_statuses,
  order_statuses
} from "../../../lib/orders/orders-contract";

interface OrdersPageProps {
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

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const session = await require_current_session();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedOrderId = resolve_query_value(resolvedSearchParams.orderId);

  const [ordersResult, orderDetailResult, fulfillmentsResult] = await Promise.all([
    fetch_orders_list(),
    selectedOrderId
      ? fetch_order_detail(selectedOrderId)
      : Promise.resolve({ data: null, error: null }),
    selectedOrderId
      ? fetch_fulfillments_by_order(selectedOrderId)
      : Promise.resolve({ data: [], pagination: null, error: null })
  ]);

  const selectedOrderFulfillments = selectedOrderId
    ? filter_fulfillments_by_order(fulfillmentsResult.data, selectedOrderId)
    : [];

  return (
    <PageShell>
      <PageHeader
        title="Orders"
        subtitle="Orders baseline (read-first)"
        note="Source: backend GET /orders, GET /orders/:orderId, GET /fulfillments. Backend RBAC/object scope remains authoritative for seller and other roles."
        rightSlot={
          <span className="bo-workspace-chip bo-workspace-chip-active">
            {session.user.primaryRole}
          </span>
        }
      />

      <PageSection title="Status Context" description="Main order statuses and payment control overlays are rendered separately.">
        <div className="bo-state-grid">
          <article className="bo-state">
            <strong>Main order status</strong>
            <div className="bo-badge-row">
              {order_statuses.map((status) => (
                <StatusBadge key={status} label={status} />
              ))}
            </div>
          </article>
          <article className="bo-state">
            <strong>Payment control overlay</strong>
            <div className="bo-badge-row">
              {order_payment_control_statuses.map((status) => (
                <StatusBadge key={status} label={status} />
              ))}
            </div>
          </article>
          <article className="bo-state">
            <strong>Fulfillment status</strong>
            <div className="bo-badge-row">
              {fulfillment_statuses.map((status) => (
                <StatusBadge key={status} label={status} />
              ))}
            </div>
          </article>
        </div>
      </PageSection>

      <PageSection title="Order List" description="Minimal list wired to backend GET /orders.">
        {ordersResult.error ? (
          <ErrorState title="Orders request failed" message={ordersResult.error} />
        ) : ordersResult.data.length === 0 ? (
          <EmptyState
            title="No orders returned"
            description="Backend returned an empty list for GET /orders."
          />
        ) : (
          <>
            {ordersResult.pagination ? (
              <p className="bo-muted">
                Total: {ordersResult.pagination.totalItems}, page {ordersResult.pagination.page} of{" "}
                {ordersResult.pagination.totalPages}
              </p>
            ) : null}
            <ul className="bo-list-grid">
              {ordersResult.data.map((order) => (
                <li
                  key={order.id}
                  className={
                    selectedOrderId === order.id ? "bo-crm-item bo-crm-item-selected" : "bo-crm-item"
                  }
                >
                  <strong>{order.orderNumber}</strong>
                  <p className="bo-muted">ID: {order.id}</p>
                  <p className="bo-muted">Deal / Client: {order.dealId} / {order.clientId}</p>
                  <div className="bo-crm-row">
                    <span className="bo-muted">Main:</span>
                    <StatusBadge label={order.status} />
                  </div>
                  <div className="bo-crm-row">
                    <span className="bo-muted">Payment control:</span>
                    <StatusBadge label={order.paymentControlStatus} />
                  </div>
                  <div className="bo-crm-row">
                    <span className="bo-muted">Delivery:</span>
                    <StatusBadge label={order.deliveryStatus} />
                  </div>
                  <p className="bo-muted">Total: {order.totalAmount} {order.currency}</p>
                  <div className="bo-crm-actions">
                    <Link
                      className="bo-crm-link"
                      href={`/backoffice/orders?orderId=${encodeURIComponent(order.id)}`}
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
        title="Order Detail"
        description="Read-only detail from GET /orders/:orderId with separated status surfaces."
      >
        {!selectedOrderId ? (
          <EmptyState
            title="Select an order"
            description="Use Open detail in the list to load order detail from backend."
          />
        ) : orderDetailResult.error ? (
          <ErrorState title="Order detail request failed" message={orderDetailResult.error} />
        ) : !orderDetailResult.data ? (
          <EmptyState
            title="Order not found"
            description="Selected order was not returned by backend."
          />
        ) : (
          <div className="bo-crm-detail-grid">
            <article className="bo-crm-detail-item">
              <strong>ID</strong>
              <p className="bo-muted">{orderDetailResult.data.id}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Order Number</strong>
              <p className="bo-muted">{orderDetailResult.data.orderNumber}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Deal / Client</strong>
              <p className="bo-muted">
                {orderDetailResult.data.dealId} / {orderDetailResult.data.clientId}
              </p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Main Status</strong>
              <div className="bo-crm-row">
                <StatusBadge label={orderDetailResult.data.status} />
              </div>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Payment Control Overlay</strong>
              <div className="bo-crm-row">
                <StatusBadge label={orderDetailResult.data.paymentControlStatus} />
              </div>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Delivery Status</strong>
              <div className="bo-crm-row">
                <StatusBadge label={orderDetailResult.data.deliveryStatus} />
              </div>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Monetary Surface</strong>
              <p className="bo-muted">
                Subtotal: {orderDetailResult.data.subtotalAmount} {orderDetailResult.data.currency}
              </p>
              <p className="bo-muted">
                Discount: {orderDetailResult.data.discountAmount} {orderDetailResult.data.currency}
              </p>
              <p className="bo-muted">
                Total: {orderDetailResult.data.totalAmount} {orderDetailResult.data.currency}
              </p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Shipment Timestamps</strong>
              <p className="bo-muted">
                Ready partial: {orderDetailResult.data.readyForPartialShipmentAt ?? "not set"}
              </p>
              <p className="bo-muted">
                Ready full: {orderDetailResult.data.readyForShipmentAt ?? "not set"}
              </p>
              <p className="bo-muted">
                Partially shipped: {orderDetailResult.data.partiallyShippedAt ?? "not set"}
              </p>
              <p className="bo-muted">Shipped: {orderDetailResult.data.shippedAt ?? "not set"}</p>
            </article>
          </div>
        )}
      </PageSection>

      <PageSection
        title="Order Items"
        description="Item-level baseline from order detail payload."
      >
        {!orderDetailResult.data ? (
          <EmptyState
            title="Detail is not loaded"
            description="Select an order to inspect item-level data."
          />
        ) : orderDetailResult.data.items.length === 0 ? (
          <EmptyState
            title="No order items"
            description="Order currently has no item-level rows in backend response."
          />
        ) : (
          <ul className="bo-list-grid">
            {orderDetailResult.data.items.map((item) => (
              <li key={item.id} className="bo-crm-item">
                <strong>Line {item.lineNo}: {item.productNameSnapshot}</strong>
                <p className="bo-muted">Product: {item.productId}</p>
                <p className="bo-muted">Qty: {item.qty} {item.unit}</p>
                <p className="bo-muted">Retail: {item.retailPrice}</p>
                <p className="bo-muted">Discount: {item.discountAmount}</p>
                <p className="bo-muted">Line total: {item.lineTotal}</p>
              </li>
            ))}
          </ul>
        )}
      </PageSection>

      <PageSection
        title="Related Fulfillments"
        description="Read-only linked fulfillments from GET /fulfillments filtered by orderId."
      >
        {!selectedOrderId ? (
          <EmptyState
            title="Select an order"
            description="Fulfillments are loaded for the selected order only."
          />
        ) : fulfillmentsResult.error ? (
          <ErrorState title="Fulfillments request failed" message={fulfillmentsResult.error} />
        ) : selectedOrderFulfillments.length === 0 ? (
          <EmptyState
            title="No related fulfillments"
            description="Backend returned no fulfillments for selected order."
          />
        ) : (
          <>
            {fulfillmentsResult.pagination ? (
              <p className="bo-muted">
                Fulfillments total: {fulfillmentsResult.pagination.totalItems}, page{" "}
                {fulfillmentsResult.pagination.page} of {fulfillmentsResult.pagination.totalPages}
              </p>
            ) : null}
            <ul className="bo-list-grid">
              {selectedOrderFulfillments.map((fulfillment) => (
                <li key={fulfillment.id} className="bo-crm-item">
                  <strong>{fulfillment.id}</strong>
                  <div className="bo-crm-row">
                    <span className="bo-muted">Status:</span>
                    <StatusBadge label={fulfillment.status} />
                  </div>
                  <p className="bo-muted">Type: {fulfillment.fulfillmentType}</p>
                  <p className="bo-muted">Items count: {fulfillment.itemsCount}</p>
                  <p className="bo-muted">Fulfilled at: {fulfillment.fulfilledAt ?? "not executed"}</p>
                  {fulfillment.failureReason ? (
                    <p className="bo-muted">Failure reason: {fulfillment.failureReason}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </PageSection>

      <PageSection
        title="Deferred Commands"
        description="Order/fulfillment mutation UI remains intentionally out of scope for this read-first step."
      >
        <p className="bo-muted">
          Status commands, payment control commands and fulfillment confirm-execution command UI are
          deferred; this page consumes only existing read endpoints and reflects backend access
          decisions.
        </p>
      </PageSection>
    </PageShell>
  );
}
