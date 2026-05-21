import { ref } from 'vue';
import { api } from '../utils/api';

export interface LedgerEntry {
  id?: string;
  firmId: string;
  transactionDate: string;
  accountHead: string;
  accountType: string;
  debitAmount: number;
  creditAmount: number;
  narration?: string;
  refType?: string;
  refId?: string;
  voucherGroupId?: string;
  voucherNo?: string;
  voucherType?: string;
  partyId?: string;
  bankAccountId?: string;
  paymentMode?: string;
}

export interface VoucherEntry {
  accountHead: string;
  accountType: string;
  debitAmount: number;
  creditAmount: number;
  narration?: string;
  partyId?: string;
  bankAccountId?: string;
  paymentMode?: string;
}

export const useAccounting = () => {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const ledgerEntries = ref<LedgerEntry[]>([]);
  const accountBalance = ref({ totalDebit: 0, totalCredit: 0, balance: 0, balanceType: 'DR' });
  const trialBalance = ref<any[]>([]);

  const fetchLedger = async (params: { accountHead?: string; fromDate?: string; toDate?: string }) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.get('/accounting/ledger', { params });
      if (response.data.success) {
        ledgerEntries.value = response.data.data;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch ledger';
    } finally {
      loading.value = false;
    }
  };

  const fetchAccountBalance = async (accountHead: string, toDate?: string) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.get('/accounting/ledger/balance', { params: { accountHead, toDate } });
      if (response.data.success) {
        accountBalance.value = response.data.data;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch balance';
    } finally {
      loading.value = false;
    }
  };

  const fetchTrialBalance = async (toDate?: string) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.get('/accounting/ledger/trial-balance', { params: { toDate } });
      if (response.data.success) {
        trialBalance.value = response.data.data;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch trial balance';
    } finally {
      loading.value = false;
    }
  };

  const createVoucher = async (data: { vtype: string; vdate?: string; narration: string; entries: VoucherEntry[] }) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.post('/accounting/vouchers', data);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create voucher';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createOpeningBalance = async (data: any) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.post('/accounting/opening-balances', data);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create opening balance';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    ledgerEntries,
    accountBalance,
    trialBalance,
    fetchLedger,
    fetchAccountBalance,
    fetchTrialBalance,
    createVoucher,
    createOpeningBalance,
  };
};
