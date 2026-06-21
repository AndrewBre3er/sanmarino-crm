import Link from "next/link";
import { EmptyState } from "../../../components/states/empty-state";
import { ErrorState } from "../../../components/states/error-state";
import { PageHeader, PageSection, PageShell } from "../../../components/shell/page-shell";
import { StatusBadge } from "../../../components/ui/status-badge";
import { require_current_session } from "../../../lib/auth/server-auth";
import {
  fetch_expense_detail,
  fetch_expenses_list,
  fetch_finance_entries_list,
  fetch_finance_entry_detail,
  fetch_marketing_expense_detail,
  fetch_marketing_expenses_list
} from "../../../lib/finance/finance-api";
import { expense_types, finance_entry_types, type FinanceEntryType } from "../../../lib/finance/finance-contract";

interface FinancePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

interface FinanceRouteQuery {
  financeEntryId?: string | undefined;
  expenseId?: string | undefined;
  marketingExpenseId?: string | undefined;
  entryType?: string | undefined;
  orderId?: string | undefined;
  paymentId?: string | undefined;
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

function set_query_value(searchParams: URLSearchParams, key: string, value: string | undefined): void {
  if (!value) {
    return;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return;
  }

  searchParams.set(key, normalized);
}

function build_finance_href(query: FinanceRouteQuery): string {
  const searchParams = new URLSearchParams();
  set_query_value(searchParams, "financeEntryId", query.financeEntryId);
  set_query_value(searchParams, "expenseId", query.expenseId);
  set_query_value(searchParams, "marketingExpenseId", query.marketingExpenseId);
  set_query_value(searchParams, "entryType", query.entryType);
  set_query_value(searchParams, "orderId", query.orderId);
  set_query_value(searchParams, "paymentId", query.paymentId);

  const queryString = searchParams.toString();
  return queryString.length > 0 ? `/backoffice/finance?${queryString}` : "/backoffice/finance";
}

function as_finance_entry_type(value: string | undefined): FinanceEntryType | undefined {
  if (!value) {
    return undefined;
  }

  return finance_entry_types.includes(value as FinanceEntryType)
    ? (value as FinanceEntryType)
    : undefined;
}

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const session = await require_current_session();
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const selectedFinanceEntryId = resolve_query_value(resolvedSearchParams.financeEntryId);
  const selectedExpenseId = resolve_query_value(resolvedSearchParams.expenseId);
  const selectedMarketingExpenseId = resolve_query_value(resolvedSearchParams.marketingExpenseId);
  const financeEntryTypeFilter = as_finance_entry_type(resolve_query_value(resolvedSearchParams.entryType));
  const orderIdFilter = resolve_query_value(resolvedSearchParams.orderId);
  const paymentIdFilter = resolve_query_value(resolvedSearchParams.paymentId);

  const [financeEntriesResult, financeEntryDetailResult, expensesResult, expenseDetailResult, marketingExpensesResult, marketingExpenseDetailResult] =
    await Promise.all([
      fetch_finance_entries_list({
        ...(financeEntryTypeFilter ? { entryType: financeEntryTypeFilter } : {}),
        ...(orderIdFilter ? { orderId: orderIdFilter } : {}),
        ...(paymentIdFilter ? { paymentId: paymentIdFilter } : {})
      }),
      selectedFinanceEntryId
        ? fetch_finance_entry_detail(selectedFinanceEntryId)
        : Promise.resolve({ data: null, error: null }),
      fetch_expenses_list(),
      selectedExpenseId ? fetch_expense_detail(selectedExpenseId) : Promise.resolve({ data: null, error: null }),
      fetch_marketing_expenses_list(),
      selectedMarketingExpenseId
        ? fetch_marketing_expense_detail(selectedMarketingExpenseId)
        : Promise.resolve({ data: null, error: null })
    ]);

  const hasFinanceEntryFilters = Boolean(financeEntryTypeFilter || orderIdFilter || paymentIdFilter);

  return (
    <PageShell>
      <PageHeader
        title="Finance"
        subtitle="Finance baseline (read-first)"
        note="Source: backend GET /finance-entries, GET /expenses, GET /marketing-expenses and detail endpoints. Backend RBAC/object scope remains authoritative."
        rightSlot={
          <span className="bo-workspace-chip bo-workspace-chip-active">
            {session.user.primaryRole}
          </span>
        }
      />

      <PageSection title="Finance Entry Types" description="Entry types from accepted contracts.">
        <div className="bo-badge-row">
          {finance_entry_types.map((entryType) => (
            <StatusBadge key={entryType} label={entryType} />
          ))}
        </div>
      </PageSection>

      <PageSection title="Expense Types" description="Expense article types from accepted contracts.">
        <div className="bo-badge-row">
          {expense_types.map((expenseType) => (
            <span key={expenseType} className="bo-workspace-chip">
              {expenseType}
            </span>
          ))}
        </div>
      </PageSection>

      <PageSection
        title="Finance Entries List"
        description="Minimal list wired to backend GET /finance-entries with optional filters from URL query."
      >
        {hasFinanceEntryFilters ? (
          <div className="bo-state bo-state-empty">
            <strong>Active filters</strong>
            <p>
              entryType: {financeEntryTypeFilter ?? "none"} | orderId: {orderIdFilter ?? "none"} |
              paymentId: {paymentIdFilter ?? "none"}
            </p>
            <Link
              className="bo-crm-link"
              href={build_finance_href({
                financeEntryId: selectedFinanceEntryId,
                expenseId: selectedExpenseId,
                marketingExpenseId: selectedMarketingExpenseId
              })}
            >
              Clear finance-entry filters
            </Link>
          </div>
        ) : null}
        {financeEntriesResult.error ? (
          <ErrorState title="Finance entries request failed" message={financeEntriesResult.error} />
        ) : financeEntriesResult.data.length === 0 ? (
          <EmptyState
            title="No finance entries returned"
            description="Backend returned an empty list for GET /finance-entries."
          />
        ) : (
          <>
            {financeEntriesResult.pagination ? (
              <p className="bo-muted">
                Total: {financeEntriesResult.pagination.totalItems}, page{" "}
                {financeEntriesResult.pagination.page} of {financeEntriesResult.pagination.totalPages}
              </p>
            ) : null}
            <ul className="bo-list-grid">
              {financeEntriesResult.data.map((entry) => (
                <li
                  key={entry.id}
                  className={
                    selectedFinanceEntryId === entry.id ? "bo-crm-item bo-crm-item-selected" : "bo-crm-item"
                  }
                >
                  <strong>{entry.id}</strong>
                  <div className="bo-crm-row">
                    <span className="bo-muted">Type:</span>
                    <StatusBadge label={entry.entryType} />
                  </div>
                  <p className="bo-muted">
                    Amount: {entry.amount} {entry.currency}
                  </p>
                  <p className="bo-muted">Recognized at: {entry.recognizedAt}</p>
                  <p className="bo-muted">
                    Payment / Order: {entry.paymentId ?? "none"} / {entry.orderId ?? "none"}
                  </p>
                  <p className="bo-muted">
                    Expense / MarketingExpense: {entry.expenseId ?? "none"} /{" "}
                    {entry.marketingExpenseId ?? "none"}
                  </p>
                  <p className="bo-muted">Cash operation: {entry.cashOperationId ?? "none"}</p>
                  <div className="bo-crm-actions">
                    <Link
                      className="bo-crm-link"
                      href={build_finance_href({
                        financeEntryId: entry.id,
                        expenseId: selectedExpenseId,
                        marketingExpenseId: selectedMarketingExpenseId,
                        entryType: financeEntryTypeFilter,
                        orderId: orderIdFilter,
                        paymentId: paymentIdFilter
                      })}
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
        title="Finance Entry Detail"
        description="Read-only detail from GET /finance-entries/:financeEntryId."
      >
        {!selectedFinanceEntryId ? (
          <EmptyState
            title="Select a finance entry"
            description="Use Open detail in the list to load finance entry detail from backend."
          />
        ) : financeEntryDetailResult.error ? (
          <ErrorState title="Finance entry detail request failed" message={financeEntryDetailResult.error} />
        ) : !financeEntryDetailResult.data ? (
          <EmptyState
            title="Finance entry not found"
            description="Selected finance entry was not returned by backend."
          />
        ) : (
          <div className="bo-crm-detail-grid">
            <article className="bo-crm-detail-item">
              <strong>ID</strong>
              <p className="bo-muted">{financeEntryDetailResult.data.id}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Entry Type</strong>
              <div className="bo-crm-row">
                <StatusBadge label={financeEntryDetailResult.data.entryType} />
              </div>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Amount / Currency</strong>
              <p className="bo-muted">
                {financeEntryDetailResult.data.amount} {financeEntryDetailResult.data.currency}
              </p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Recognized At</strong>
              <p className="bo-muted">{financeEntryDetailResult.data.recognizedAt}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Payment Linkage</strong>
              <p className="bo-muted">{financeEntryDetailResult.data.paymentId ?? "none"}</p>
              {financeEntryDetailResult.data.paymentId ? (
                <Link
                  className="bo-crm-link"
                  href={`/backoffice/payments?paymentId=${encodeURIComponent(financeEntryDetailResult.data.paymentId)}`}
                >
                  Open payment detail
                </Link>
              ) : null}
            </article>
            <article className="bo-crm-detail-item">
              <strong>Order Linkage</strong>
              <p className="bo-muted">{financeEntryDetailResult.data.orderId ?? "none"}</p>
              {financeEntryDetailResult.data.orderId ? (
                <Link
                  className="bo-crm-link"
                  href={`/backoffice/orders?orderId=${encodeURIComponent(financeEntryDetailResult.data.orderId)}`}
                >
                  Open order detail
                </Link>
              ) : null}
            </article>
            <article className="bo-crm-detail-item">
              <strong>Expense Linkage</strong>
              <p className="bo-muted">
                {financeEntryDetailResult.data.expenseId ?? "none"} /{" "}
                {financeEntryDetailResult.data.marketingExpenseId ?? "none"}
              </p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Cash Operation</strong>
              <p className="bo-muted">{financeEntryDetailResult.data.cashOperationId ?? "none"}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Description</strong>
              <p className="bo-muted">{financeEntryDetailResult.data.description ?? "not provided"}</p>
            </article>
          </div>
        )}
      </PageSection>

      <PageSection title="Expenses List" description="Read-only list wired to backend GET /expenses.">
        {expensesResult.error ? (
          <ErrorState title="Expenses request failed" message={expensesResult.error} />
        ) : expensesResult.data.length === 0 ? (
          <EmptyState title="No expenses returned" description="Backend returned an empty list for GET /expenses." />
        ) : (
          <>
            {expensesResult.pagination ? (
              <p className="bo-muted">
                Total: {expensesResult.pagination.totalItems}, page {expensesResult.pagination.page} of{" "}
                {expensesResult.pagination.totalPages}
              </p>
            ) : null}
            <ul className="bo-list-grid">
              {expensesResult.data.map((expense) => (
                <li
                  key={expense.id}
                  className={
                    selectedExpenseId === expense.id ? "bo-crm-item bo-crm-item-selected" : "bo-crm-item"
                  }
                >
                  <strong>{expense.id}</strong>
                  <p className="bo-muted">Type: {expense.expenseType}</p>
                  <p className="bo-muted">
                    Amount: {expense.amount} {expense.currency}
                  </p>
                  <p className="bo-muted">Occurred at: {expense.occurredAt}</p>
                  <p className="bo-muted">Order linkage: {expense.relatedOrderId ?? "none"}</p>
                  <div className="bo-crm-actions">
                    <Link
                      className="bo-crm-link"
                      href={build_finance_href({
                        financeEntryId: selectedFinanceEntryId,
                        expenseId: expense.id,
                        marketingExpenseId: selectedMarketingExpenseId,
                        entryType: financeEntryTypeFilter,
                        orderId: orderIdFilter,
                        paymentId: paymentIdFilter
                      })}
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

      <PageSection title="Expense Detail" description="Read-only detail from GET /expenses/:expenseId.">
        {!selectedExpenseId ? (
          <EmptyState
            title="Select an expense"
            description="Use Open detail in the list to load expense detail from backend."
          />
        ) : expenseDetailResult.error ? (
          <ErrorState title="Expense detail request failed" message={expenseDetailResult.error} />
        ) : !expenseDetailResult.data ? (
          <EmptyState title="Expense not found" description="Selected expense was not returned by backend." />
        ) : (
          <div className="bo-crm-detail-grid">
            <article className="bo-crm-detail-item">
              <strong>ID</strong>
              <p className="bo-muted">{expenseDetailResult.data.id}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Type</strong>
              <p className="bo-muted">{expenseDetailResult.data.expenseType}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Amount / Currency</strong>
              <p className="bo-muted">
                {expenseDetailResult.data.amount} {expenseDetailResult.data.currency}
              </p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Occurred At</strong>
              <p className="bo-muted">{expenseDetailResult.data.occurredAt}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Order Linkage</strong>
              <p className="bo-muted">{expenseDetailResult.data.relatedOrderId ?? "none"}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Description</strong>
              <p className="bo-muted">{expenseDetailResult.data.description ?? "not provided"}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Updated</strong>
              <p className="bo-muted">Created: {expenseDetailResult.data.createdAt}</p>
              <p className="bo-muted">Updated: {expenseDetailResult.data.updatedAt}</p>
            </article>
          </div>
        )}
      </PageSection>

      <PageSection
        title="Marketing Expenses List"
        description="Read-only list wired to backend GET /marketing-expenses."
      >
        {marketingExpensesResult.error ? (
          <ErrorState title="Marketing expenses request failed" message={marketingExpensesResult.error} />
        ) : marketingExpensesResult.data.length === 0 ? (
          <EmptyState
            title="No marketing expenses returned"
            description="Backend returned an empty list for GET /marketing-expenses."
          />
        ) : (
          <>
            {marketingExpensesResult.pagination ? (
              <p className="bo-muted">
                Total: {marketingExpensesResult.pagination.totalItems}, page{" "}
                {marketingExpensesResult.pagination.page} of {marketingExpensesResult.pagination.totalPages}
              </p>
            ) : null}
            <ul className="bo-list-grid">
              {marketingExpensesResult.data.map((marketingExpense) => (
                <li
                  key={marketingExpense.id}
                  className={
                    selectedMarketingExpenseId === marketingExpense.id
                      ? "bo-crm-item bo-crm-item-selected"
                      : "bo-crm-item"
                  }
                >
                  <strong>{marketingExpense.id}</strong>
                  <p className="bo-muted">Source: {marketingExpense.source}</p>
                  <p className="bo-muted">Campaign: {marketingExpense.campaign ?? "none"}</p>
                  <p className="bo-muted">
                    Amount: {marketingExpense.amount} {marketingExpense.currency}
                  </p>
                  <p className="bo-muted">Occurred at: {marketingExpense.occurredAt}</p>
                  <div className="bo-crm-actions">
                    <Link
                      className="bo-crm-link"
                      href={build_finance_href({
                        financeEntryId: selectedFinanceEntryId,
                        expenseId: selectedExpenseId,
                        marketingExpenseId: marketingExpense.id,
                        entryType: financeEntryTypeFilter,
                        orderId: orderIdFilter,
                        paymentId: paymentIdFilter
                      })}
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
        title="Marketing Expense Detail"
        description="Read-only detail from GET /marketing-expenses/:marketingExpenseId."
      >
        {!selectedMarketingExpenseId ? (
          <EmptyState
            title="Select a marketing expense"
            description="Use Open detail in the list to load marketing expense detail from backend."
          />
        ) : marketingExpenseDetailResult.error ? (
          <ErrorState
            title="Marketing expense detail request failed"
            message={marketingExpenseDetailResult.error}
          />
        ) : !marketingExpenseDetailResult.data ? (
          <EmptyState
            title="Marketing expense not found"
            description="Selected marketing expense was not returned by backend."
          />
        ) : (
          <div className="bo-crm-detail-grid">
            <article className="bo-crm-detail-item">
              <strong>ID</strong>
              <p className="bo-muted">{marketingExpenseDetailResult.data.id}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Source / Campaign</strong>
              <p className="bo-muted">
                {marketingExpenseDetailResult.data.source} /{" "}
                {marketingExpenseDetailResult.data.campaign ?? "none"}
              </p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Amount / Currency</strong>
              <p className="bo-muted">
                {marketingExpenseDetailResult.data.amount} {marketingExpenseDetailResult.data.currency}
              </p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Occurred At</strong>
              <p className="bo-muted">{marketingExpenseDetailResult.data.occurredAt}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Description</strong>
              <p className="bo-muted">{marketingExpenseDetailResult.data.description ?? "not provided"}</p>
            </article>
            <article className="bo-crm-detail-item">
              <strong>Updated</strong>
              <p className="bo-muted">Created: {marketingExpenseDetailResult.data.createdAt}</p>
              <p className="bo-muted">Updated: {marketingExpenseDetailResult.data.updatedAt}</p>
            </article>
          </div>
        )}
      </PageSection>

      <PageSection
        title="Deferred Commands"
        description="This step is read-first and does not add command UI."
      >
        <p className="bo-muted">
          Expense/marketing-expense create and update actions stay backend-only in this slice. Refunds,
          returns and heavy finance analytics are intentionally deferred.
        </p>
      </PageSection>
    </PageShell>
  );
}
