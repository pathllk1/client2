import { reactive, ref, computed } from 'vue';
import { api } from '@/utils/api';

export interface FirmLocation {
  gst_number: string;
  state: string;
  state_code: string;
  address: string;
  is_default: boolean;
}

export interface PartyLocation {
  gstin: string;
  state: string;
  stateCode: string;
  address: string;
  pincode: string;
  contact?: string;
  isPrimary: boolean;
}

export interface BillingState {
  stocks: any[];
  parties: any[];
  cart: any[];
  selectedParty: any | null;
  selectedPartyGstin: string | null;
  selectedPartyLocation: PartyLocation | null;
  selectedConsignee: any | null;
  consigneeSameAsBillTo: boolean;
  meta: {
    billNo: string;
    billDate: string;
    billType: 'intra-state' | 'inter-state';
    reverseCharge: boolean;
    referenceNo: string;
    vehicleNo: string;
    dispatchThrough: string;
    narration: string;
    supplierBillNo?: string;
    btype: 'SALES' | 'PURCHASE' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'PROFORMA' | 'DELIVERY_NOTE';
  };
  otherCharges: any[];
  currentFirmName: string;
  gstEnabled: boolean;
  firmLocations: FirmLocation[];
  activeFirmLocation: FirmLocation | null;
  isReturnMode: boolean;
  returnFromBillId: string | null;
  currentBill: any | null;
}

export const INDIA_STATE_CODES: Record<string, string> = {
  'jammu and kashmir': '01', 'himachal pradesh': '02', 'punjab': '03', 'chandigarh': '04',
  'uttarakhand': '05', 'haryana': '06', 'delhi': '07', 'rajasthan': '08', 'uttar pradesh': '09',
  'bihar': '10', 'sikkim': '11', 'arunachal pradesh': '12', 'nagaland': '13', 'manipur': '14',
  'mizoram': '15', 'tripura': '16', 'meghalaya': '17', 'assam': '18', 'west bengal': '19',
  'jharkhand': '20', 'odisha': '21', 'chhattisgarh': '22', 'madhya pradesh': '23', 'gujarat': '24',
  'maharashtra': '27', 'andhra pradesh': '28', 'karnataka': '29', 'goa': '30', 'kerala': '32',
  'tamil nadu': '33', 'telangana': '36'
};

export const useBillingState = () => {
  const state = reactive<BillingState>({
    stocks: [],
    parties: [],
    cart: [],
    selectedParty: null,
    selectedPartyGstin: null,
    selectedPartyLocation: null,
    selectedConsignee: null,
    consigneeSameAsBillTo: true,
    meta: {
      billNo: '',
      billDate: new Date().toISOString().split('T')[0] || '',
      billType: 'intra-state',
      reverseCharge: false,
      referenceNo: '',
      vehicleNo: '',
      dispatchThrough: '',
      narration: '',
      btype: 'SALES'
    },
    otherCharges: [],
    currentFirmName: 'Loading...',
    gstEnabled: true,
    firmLocations: [],
    activeFirmLocation: null,
    isReturnMode: false,
    returnFromBillId: null,
    currentBill: null
  });

  const loading = ref(false);

  const determineGstBillType = () => {
    const firmCode = state.activeFirmLocation?.state_code || state.activeFirmLocation?.gst_number?.substring(0, 2);
    
    const partyCode = state.selectedPartyLocation?.stateCode || 
                     state.selectedParty?.stateCode ||
                     (state.selectedPartyGstin && state.selectedPartyGstin !== 'UNREGISTERED' ? state.selectedPartyGstin.substring(0, 2) : null) ||
                     (state.selectedParty?.state ? INDIA_STATE_CODES[state.selectedParty.state.trim().toLowerCase()] : null);

    if (!firmCode || !partyCode) return 'intra-state';
    return firmCode === partyCode ? 'intra-state' : 'inter-state';
  };

  const totals = computed(() => {
    let grossTotal = 0;
    let totalTax = 0;

    state.cart.forEach(item => {
      const qty = parseFloat(state.isReturnMode ? item.returnQty : item.qty) || 0;
      const lineVal = qty * item.rate * (1 - (item.disc || 0) / 100);
      if (state.gstEnabled) totalTax += lineVal * (item.grate / 100);
      grossTotal += lineVal;
    });

    let otherChargesTotal = 0;
    let otherChargesGstTotal = 0;
    state.otherCharges.forEach(charge => {
      const amt = parseFloat(charge.amount) || 0;
      otherChargesTotal += amt;
      if (state.gstEnabled) otherChargesGstTotal += (amt * (parseFloat(charge.grate) || 0)) / 100;
    });
    grossTotal += otherChargesTotal;

    let cgst = 0, sgst = 0, igst = 0;
    if (state.gstEnabled && state.meta.billType === 'intra-state') {
      cgst = (totalTax / 2) + (otherChargesGstTotal / 2);
      sgst = (totalTax / 2) + (otherChargesGstTotal / 2);
    } else if (state.gstEnabled) {
      igst = totalTax + otherChargesGstTotal;
    }

    const netTotalBeforeRoundOff = grossTotal + (state.meta.reverseCharge ? 0 : cgst + sgst + igst);
    const netTotal = Math.round(netTotalBeforeRoundOff);
    const roundOff = netTotal - netTotalBeforeRoundOff;

    return { grossTotal, totalTax, cgst, sgst, igst, netTotal, roundOff };
  });

  const fetchData = async () => {
    loading.value = true;
    try {
      const [stocksRes, partiesRes, firmRes] = await Promise.all([
        api.get('/inventory/stock'),
        api.get('/accounting/parties'),
        api.get('/firms/current') // Assuming this exists or using useAuth
      ]);

      state.stocks = stocksRes.data || [];
      state.parties = partiesRes.data || [];
      
      // Update firm info
      if (firmRes.success) {
        const firm = firmRes.data;
        state.currentFirmName = firm.name;
        state.firmLocations = firm.locations || [];
        state.activeFirmLocation = state.firmLocations.find(l => l.is_default) || state.firmLocations[0] || null;
        state.gstEnabled = firm.gst_enabled !== false;
      }
    } catch (err) {
      console.error('Failed to fetch billing data', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchNextBillNo = async (type: string) => {
    try {
      const res = await api.get('/accounting/bills/get-next-number', { params: { type } });
      if (res.success) {
        state.meta.billNo = res.data;
      }
    } catch (err) {
      console.warn('Failed to fetch next bill number', err);
    }
  };

  const populateConsigneeFromBillTo = () => {
    if (!state.selectedParty) return;
    state.selectedConsignee = {
      name: state.selectedParty.name,
      address: state.selectedPartyLocation?.address || state.selectedParty.address,
      gstin: state.selectedPartyLocation?.gstin || state.selectedParty.gstin,
      state: state.selectedPartyLocation?.state || state.selectedParty.state,
      pin: state.selectedPartyLocation?.pincode || state.selectedParty.pin
    };
  };

  return {
    state,
    loading,
    totals,
    fetchData,
    fetchNextBillNo,
    determineGstBillType,
    populateConsigneeFromBillTo
  };
};
