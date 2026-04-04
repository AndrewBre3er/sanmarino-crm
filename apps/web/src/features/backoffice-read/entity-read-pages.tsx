"use client";

import { StatusBadge } from "../../components/ui/status-badge";
import {
  fetch_deals_collection,
  fetch_deal_detail,
  fetch_delivery_task_detail,
  fetch_delivery_tasks_collection,
  fetch_leads_collection,
  fetch_lead_detail,
  fetch_order_detail,
  fetch_orders_collection,
  fetch_payment_detail,
  fetch_payments_collection,
  fetch_return_request_detail,
  fetch_return_requests_collection
} from "../../lib/read-api-client";
import type {
  DealReadModel,
  DeliveryTaskReadModel,
  LeadReadModel,
  OrderDetailReadModel,
  OrderReadModel,
  PaymentReadModel,
  ReturnRequestReadModel
} from "../../types/read-api";
import { format_datetime, format_optional } from "./read-only-entity.helpers";
import {
  type ReadOnlyColumn,
  type ReadOnlyDetailField,
  ReadOnlyEntityScreen
} from "./read-only-entity-screen";

function amount_with_currency(amount: string, currency: string): string {
  return `${amount} ${currency}`;
}

const leads_columns: readonly ReadOnlyColumn<LeadReadModel>[] = [
  {
    key: "id",
    header: "Lead ID",
    render: lead => lead.id
  },
  {
    key: "source",
    header: "Source",
    render: lead => format_optional(lead.source)
  },
  {
    key: "status",
    header: "Status",
    render: lead => <StatusBadge label={lead.status} />
  },
  {
    key: "updatedAt",
    header: "Updated",
    render: lead => format_datetime(lead.updatedAt)
  }
];

const leads_detail_fields: readonly ReadOnlyDetailField<LeadReadModel>[] = [
  { key: "id", label: "Lead ID", render: lead => lead.id },
  { key: "source", label: "Source", render: lead => format_optional(lead.source) },
  { key: "status", label: "Status", render: lead => <StatusBadge label={lead.status} /> },
  { key: "title", label: "Title", render: lead => format_optional(lead.title) },
  {
    key: "responsible",
    label: "Responsible User",
    render: lead => format_optional(lead.responsibleUserId)
  },
  { key: "notes", label: "Notes", render: lead => format_optional(lead.notes) },
  { key: "createdAt", label: "Created", render: lead => format_datetime(lead.createdAt) },
  { key: "updatedAt", label: "Updated", render: lead => format_datetime(lead.updatedAt) }
];

const deals_columns: readonly ReadOnlyColumn<DealReadModel>[] = [
  {
    key: "id",
    header: "Deal ID",
    render: deal => deal.id
  },
  {
    key: "title",
    header: "Title",
    render: deal => format_optional(deal.title)
  },
  {
    key: "status",
    header: "Status",
    render: deal => <StatusBadge label={deal.status} />
  },
  {
    key: "updatedAt",
    header: "Updated",
    render: deal => format_datetime(deal.updatedAt)
  }
];

const deals_detail_fields: readonly ReadOnlyDetailField<DealReadModel>[] = [
  { key: "id", label: "Deal ID", render: deal => deal.id },
  { key: "leadId", label: "Lead ID", render: deal => format_optional(deal.leadId) },
  { key: "title", label: "Title", render: deal => format_optional(deal.title) },
  { key: "status", label: "Status", render: deal => <StatusBadge label={deal.status} /> },
  {
    key: "responsible",
    label: "Responsible User",
    render: deal => format_optional(deal.responsibleUserId)
  },
  { key: "notes", label: "Notes", render: deal => format_optional(deal.notes) },
  { key: "createdAt", label: "Created", render: deal => format_datetime(deal.createdAt) },
  { key: "updatedAt", label: "Updated", render: deal => format_datetime(deal.updatedAt) }
];

const orders_columns: readonly ReadOnlyColumn<OrderReadModel>[] = [
  {
    key: "orderNumber",
    header: "Order Number",
    render: order => format_optional(order.orderNumber)
  },
  {
    key: "dealId",
    header: "Deal ID",
    render: order => order.dealId
  },
  {
    key: "status",
    header: "Status",
    render: order => <StatusBadge label={order.status} />
  },
  {
    key: "totalAmount",
    header: "Amount",
    render: order => amount_with_currency(order.totalAmount, order.currency)
  }
];

const orders_detail_fields: readonly ReadOnlyDetailField<OrderDetailReadModel>[] = [
  { key: "id", label: "Order ID", render: order => order.id },
  { key: "orderNumber", label: "Order Number", render: order => order.orderNumber },
  { key: "dealId", label: "Deal ID", render: order => order.dealId },
  { key: "status", label: "Status", render: order => <StatusBadge label={order.status} /> },
  {
    key: "fulfillmentType",
    label: "Fulfillment",
    render: order => format_optional(order.fulfillmentType)
  },
  {
    key: "deliveryStatus",
    label: "Delivery Status",
    render: order => <StatusBadge label={order.deliveryStatus} />
  },
  {
    key: "totalAmount",
    label: "Total Amount",
    render: order => amount_with_currency(order.totalAmount, order.currency)
  },
  { key: "createdAt", label: "Created", render: order => format_datetime(order.createdAt) },
  { key: "updatedAt", label: "Updated", render: order => format_datetime(order.updatedAt) }
];

function render_order_detail_extras(order: OrderDetailReadModel) {
  return (
    <div className="bo-detail-subsections">
      <section className="bo-detail-card">
        <h3>Order Items</h3>
        {order.items.length === 0 ? (
          <p className="bo-muted">No items in current detail payload.</p>
        ) : (
          <table className="bo-subtable">
            <thead>
              <tr>
                <th scope="col">Line</th>
                <th scope="col">Product</th>
                <th scope="col">Qty</th>
                <th scope="col">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map(item => (
                <tr key={item.id}>
                  <td>{item.lineNo}</td>
                  <td>{item.productNameSnapshot}</td>
                  <td>{item.qty}</td>
                  <td>{item.lineTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bo-detail-card">
        <h3>Related Records</h3>
        <ul className="bo-related-list">
          <li>Payments: {order.paymentIds.length > 0 ? order.paymentIds.join(", ") : "-"}</li>
          <li>
            Delivery Tasks:{" "}
            {order.deliveryTaskIds.length > 0 ? order.deliveryTaskIds.join(", ") : "-"}
          </li>
          <li>
            Return Requests:{" "}
            {order.returnRequestIds.length > 0 ? order.returnRequestIds.join(", ") : "-"}
          </li>
        </ul>
      </section>
    </div>
  );
}

const payments_columns: readonly ReadOnlyColumn<PaymentReadModel>[] = [
  {
    key: "paymentNumber",
    header: "Payment Number",
    render: payment => format_optional(payment.paymentNumber)
  },
  {
    key: "orderId",
    header: "Order ID",
    render: payment => payment.orderId
  },
  {
    key: "status",
    header: "Status",
    render: payment => <StatusBadge label={payment.status} />
  },
  {
    key: "amount",
    header: "Amount",
    render: payment => amount_with_currency(payment.amount, "RUB")
  }
];

const payments_detail_fields: readonly ReadOnlyDetailField<PaymentReadModel>[] = [
  { key: "id", label: "Payment ID", render: payment => payment.id },
  {
    key: "paymentNumber",
    label: "Payment Number",
    render: payment => format_optional(payment.paymentNumber)
  },
  { key: "orderId", label: "Order ID", render: payment => payment.orderId },
  { key: "status", label: "Status", render: payment => <StatusBadge label={payment.status} /> },
  {
    key: "paymentMethod",
    label: "Method",
    render: payment => format_optional(payment.paymentMethod)
  },
  {
    key: "amount",
    label: "Amount",
    render: payment => amount_with_currency(payment.amount, "RUB")
  },
  {
    key: "refundedAmount",
    label: "Refunded Amount",
    render: payment => amount_with_currency(payment.refundedAmount, "RUB")
  },
  { key: "receivedAt", label: "Received At", render: payment => format_datetime(payment.receivedAt) },
  {
    key: "externalReference",
    label: "External Reference",
    render: payment => format_optional(payment.externalReference)
  }
];

const delivery_tasks_columns: readonly ReadOnlyColumn<DeliveryTaskReadModel>[] = [
  { key: "id", header: "Task ID", render: task => task.id },
  { key: "orderId", header: "Order ID", render: task => task.orderId },
  {
    key: "status",
    header: "Status",
    render: task => <StatusBadge label={task.status} />
  },
  {
    key: "plannedDate",
    header: "Planned Date",
    render: task => format_datetime(task.plannedDate)
  }
];

const delivery_tasks_detail_fields: readonly ReadOnlyDetailField<DeliveryTaskReadModel>[] = [
  { key: "id", label: "Task ID", render: task => task.id },
  { key: "orderId", label: "Order ID", render: task => task.orderId },
  { key: "status", label: "Status", render: task => <StatusBadge label={task.status} /> },
  {
    key: "sequenceNo",
    label: "Sequence",
    render: task => format_optional(task.sequenceNo)
  },
  {
    key: "plannedDate",
    label: "Planned Date",
    render: task => format_datetime(task.plannedDate)
  },
  {
    key: "deliveredAt",
    label: "Delivered At",
    render: task => format_datetime(task.deliveredAt)
  },
  {
    key: "addressText",
    label: "Address",
    render: task => format_optional(task.addressText)
  },
  {
    key: "recipient",
    label: "Recipient",
    render: task => format_optional(task.recipientName)
  },
  {
    key: "recipientPhone",
    label: "Recipient Phone",
    render: task => format_optional(task.recipientPhone)
  },
  {
    key: "failureReason",
    label: "Failure Reason",
    render: task => format_optional(task.failureReason)
  }
];

const return_requests_columns: readonly ReadOnlyColumn<ReturnRequestReadModel>[] = [
  { key: "id", header: "Return Request ID", render: request => request.id },
  { key: "orderId", header: "Order ID", render: request => request.orderId },
  {
    key: "status",
    header: "Status",
    render: request => <StatusBadge label={request.status} />
  },
  {
    key: "createdAt",
    header: "Created",
    render: request => format_datetime(request.createdAt)
  }
];

const return_requests_detail_fields: readonly ReadOnlyDetailField<ReturnRequestReadModel>[] = [
  { key: "id", label: "Return Request ID", render: request => request.id },
  { key: "orderId", label: "Order ID", render: request => request.orderId },
  {
    key: "status",
    label: "Status",
    render: request => <StatusBadge label={request.status} />
  },
  { key: "reason", label: "Reason", render: request => format_optional(request.reason) },
  {
    key: "requestedRefundAmount",
    label: "Requested Refund",
    render: request => format_optional(request.requestedRefundAmount)
  },
  {
    key: "approvedRefundAmount",
    label: "Approved Refund",
    render: request => format_optional(request.approvedRefundAmount)
  },
  {
    key: "submittedAt",
    label: "Submitted At",
    render: request => format_datetime(request.submittedAt)
  },
  {
    key: "processedAt",
    label: "Processed At",
    render: request => format_datetime(request.processedAt)
  },
  {
    key: "closedAt",
    label: "Closed At",
    render: request => format_datetime(request.closedAt)
  }
];

export function LeadsReadPageContent() {
  return (
    <ReadOnlyEntityScreen
      title="Leads"
      subtitle="Read-only lead list wired to backend read-side API"
      workspace="sales"
      query={{ page: 1, pageSize: 20, sortBy: "createdAt", sortDirection: "desc" }}
      fetchCollection={fetch_leads_collection}
      fetchDetail={fetch_lead_detail}
      columns={leads_columns}
      detailFields={leads_detail_fields}
      getStatus={lead => lead.status}
    />
  );
}

export function DealsReadPageContent() {
  return (
    <ReadOnlyEntityScreen
      title="Deals"
      subtitle="Read-only deal list wired to backend read-side API"
      workspace="sales"
      query={{ page: 1, pageSize: 20, sortBy: "updatedAt", sortDirection: "desc" }}
      fetchCollection={fetch_deals_collection}
      fetchDetail={fetch_deal_detail}
      columns={deals_columns}
      detailFields={deals_detail_fields}
      getStatus={deal => deal.status}
    />
  );
}

export function OrdersReadPageContent() {
  return (
    <ReadOnlyEntityScreen
      title="Orders"
      subtitle="Read-only order list wired to backend read-side API"
      workspace="sales"
      query={{ page: 1, pageSize: 20, sortBy: "createdAt", sortDirection: "desc" }}
      fetchCollection={fetch_orders_collection}
      fetchDetail={fetch_order_detail}
      columns={orders_columns}
      detailFields={orders_detail_fields}
      getStatus={order => order.status}
      renderDetailExtras={render_order_detail_extras}
    />
  );
}

export function PaymentsReadPageContent() {
  return (
    <ReadOnlyEntityScreen
      title="Payments"
      subtitle="Read-only payment list wired to backend read-side API"
      workspace="finance"
      query={{ page: 1, pageSize: 20, sortBy: "createdAt", sortDirection: "desc" }}
      fetchCollection={fetch_payments_collection}
      fetchDetail={fetch_payment_detail}
      columns={payments_columns}
      detailFields={payments_detail_fields}
      getStatus={payment => payment.status}
    />
  );
}

export function DeliveryTasksReadPageContent() {
  return (
    <ReadOnlyEntityScreen
      title="Delivery Tasks"
      subtitle="Read-only delivery task list wired to backend read-side API"
      workspace="logistics"
      query={{ page: 1, pageSize: 20, sortBy: "createdAt", sortDirection: "desc" }}
      fetchCollection={fetch_delivery_tasks_collection}
      fetchDetail={fetch_delivery_task_detail}
      columns={delivery_tasks_columns}
      detailFields={delivery_tasks_detail_fields}
      getStatus={task => task.status}
    />
  );
}

export function ReturnRequestsReadPageContent() {
  return (
    <ReadOnlyEntityScreen
      title="Return Requests"
      subtitle="Read-only return request list wired to backend read-side API"
      workspace="sales"
      query={{ page: 1, pageSize: 20, sortBy: "createdAt", sortDirection: "desc" }}
      fetchCollection={fetch_return_requests_collection}
      fetchDetail={fetch_return_request_detail}
      columns={return_requests_columns}
      detailFields={return_requests_detail_fields}
      getStatus={request => request.status}
    />
  );
}

