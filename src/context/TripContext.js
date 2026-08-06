import React, { createContext, useContext, useState } from 'react';

const TripContext = createContext(null);

const initialTripState = {
  id: null,
  startLocation: null,
  destination: null,
  date: null,
  tripType: null, // 'round' | 'stay'
  conveyance: null, // 'bike' | 'car' | 'bus' | 'train'
  status: 'draft', // draft -> in_progress -> at_site -> returning -> completed -> submitted
  outboundPoints: [],
  returnPoints: [],
  outboundDistanceKm: 0,
  returnDistanceKm: 0,
  startTime: null,
  siteReachedTime: null,
  visitCompletedTime: null,
  endTime: null,
  receipts: [], // { uri, category, amount }
  ticketAmount: 0, // for bus/train
  stayExpenses: [], // { type: 'hotel'|'food'|'other', amount, notes, uri }
  callerDetails: { callerName: '' },
  engineerRemarks: '',
  additionalKm: 0,
  additionalKmReason: '',
};

export function TripProvider({ children }) {
  const [activeTrip, setActiveTrip] = useState(initialTripState);

  const updateTrip = (updates) => {
    setActiveTrip((prev) => ({ ...prev, ...updates }));
  };

  const addOutboundPoint = (point) => {
    setActiveTrip((prev) => ({ ...prev, outboundPoints: [...prev.outboundPoints, point] }));
  };

  const addReturnPoint = (point) => {
    setActiveTrip((prev) => ({ ...prev, returnPoints: [...prev.returnPoints, point] }));
  };

  const addReceipt = (receipt) => {
    setActiveTrip((prev) => ({ ...prev, receipts: [...prev.receipts, receipt] }));
  };

  const addStayExpense = (expense) => {
    setActiveTrip((prev) => ({ ...prev, stayExpenses: [...prev.stayExpenses, expense] }));
  };

  // Patches the most recently added expense matching `uri` once its receipt
  // upload to the backend (MongoDB) resolves — records the receiptId (or an
  // uploadFailed flag so TripSummaryScreen can retry at submit time).
  const updateStayExpenseByUri = (uri, patch) => {
    setActiveTrip((prev) => ({
      ...prev,
      stayExpenses: prev.stayExpenses.map((e) => (e.uri === uri ? { ...e, ...patch } : e)),
    }));
  };

  const resetTrip = () => setActiveTrip(initialTripState);

  return (
    <TripContext.Provider
      value={{
        activeTrip,
        updateTrip,
        addOutboundPoint,
        addReturnPoint,
        addReceipt,
        addStayExpense,
        updateStayExpenseByUri,
        resetTrip,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}

export const useTrip = () => useContext(TripContext);
