<template>
  <section class="totals-strip" aria-label="Invoice totals">
    <div class="summary-item muted">
      <span>Total Items</span>
      <strong>{{ state.cart.length }}</strong>
    </div>
    <div class="summary-item muted">
      <span>Total Qty</span>
      <strong>{{ totalQuantity.toFixed(2) }}</strong>
    </div>

    <div class="summary-item">
      <span>Taxable Value</span>
      <strong>INR {{ money(totals.grossTotal) }}</strong>
    </div>

    <template v-if="state.gstEnabled">
      <template v-if="state.meta.billType === 'intra-state'">
        <div class="summary-item">
          <span>CGST</span>
          <strong>INR {{ money(totals.cgst) }}</strong>
        </div>
        <div class="summary-item">
          <span>SGST</span>
          <strong>INR {{ money(totals.sgst) }}</strong>
        </div>
      </template>
      <template v-else>
        <div class="summary-item">
          <span>IGST</span>
          <strong>INR {{ money(totals.igst) }}</strong>
        </div>
      </template>
    </template>

    <template v-if="otherChargesTotal > 0">
      <div class="summary-item">
        <span>Other Charges</span>
        <strong>INR {{ money(otherChargesTotal) }}</strong>
      </div>
    </template>

    <div class="summary-item">
      <span>Round Off</span>
      <strong>{{ totals.roundOff > 0 ? '+' : '' }}INR {{ money(totals.roundOff) }}</strong>
    </div>

    <div v-if="state.meta.reverseCharge" class="summary-item danger">
      <span>Reverse Charge</span>
      <strong>Applies</strong>
    </div>

    <div class="summary-item net">
      <span>Net Total</span>
      <strong>INR {{ money(totals.netTotal, 0) }}</strong>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BillingState } from '@/composables/useBillingState';

const props = defineProps<{
  state: BillingState;
  totals: any;
}>();

const otherChargesTotal = computed(() => {
  return props.state.otherCharges.reduce((sum, charge) => sum + (parseFloat(charge.amount) || 0), 0);
});

const totalQuantity = computed(() => {
  return props.state.cart.reduce((sum, item) => {
    const qty = parseFloat(props.state.isReturnMode ? item.returnQty : item.qty) || 0;
    return sum + qty;
  }, 0);
});

function money(value: number, digits = 2) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}
</script>

<style scoped>
.totals-strip {
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
  gap: 8px;
  padding: 10px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-top: 0;
  box-shadow: 0 -4px 6px -1px rgba(15, 23, 42, 0.06);
  flex-wrap: wrap;
}
.summary-item {
  display: grid;
  gap: 3px;
  min-width: 112px;
  padding: 6px 8px;
  border-left: 1px solid #e2e8f0;
  text-align: right;
}
.summary-item span {
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.summary-item strong {
  color: #334155;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  white-space: nowrap;
}
.summary-item.muted {
  min-width: 86px;
  text-align: left;
  border-left: 0;
}
.summary-item.danger strong {
  color: #dc2626;
}
.summary-item.net {
  min-width: 150px;
  background: white;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
}
.summary-item.net strong {
  color: #1d4ed8;
  font-size: 18px;
  line-height: 1.1;
}
@media (max-width: 760px) {
  .totals-strip {
    justify-content: stretch;
  }
  .summary-item {
    flex: 1 1 45%;
    text-align: left;
  }
}
</style>
