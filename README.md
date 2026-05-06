# Sikko Industries Invoice Module

This workspace contains a prototype billing and invoice generation module for Sikko Industries Ltd.

## Structure

- `frontend/` — React + Vite app with invoice form, product table logic, payment settings, and PDF export.
- `server/` — Node.js Express backend for invoice calculations and product metadata.

## Run locally

1. Install frontend dependencies:
   - `cd frontend`
   - `npm install`
2. Start frontend:
   - `npm run dev`
3. Install backend dependencies:
   - `cd ../server`
   - `npm install`
4. Start backend:
   - `npm start`

## Notes

- Product selection automatically loads HSN, packing, unit price, and GST rate.
- Invoice preview can be printed or exported as PDF.
- Payment settings page holds bank details, UPI QR code, and auto-print settings.
