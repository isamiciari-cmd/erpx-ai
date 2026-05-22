import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  FileText,
  Shield,
  QrCode,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Eye,
  RefreshCw,
} from "lucide-react";

interface ZATCAInvoice {
  id: number;
  invoiceNumber: string;
  uuid: string;
  customerName: string;
  customerVAT: string;
  supplierVAT: string;
  total: number;
  vat: number;
  xml: string;
  signature: string;
  qrCode: string;
  zatcaStatus: "pending" | "cleared" | "reported" | "rejected";
  zatcaResponse?: string;
  createdAt: string;
  submittedAt?: string;
  retryCount: number;
}

// Mock ZATCA API
const zatcaAPI = {
  invoices: [] as ZATCAInvoice[],
  nextId: 1,

  generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  generateXML(invoice: Partial<ZATCAInvoice>): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
  <cbc:UUID>${invoice.uuid}</cbc:UUID>
  <cbc:IssueDate>${new Date().toISOString().split("T")[0]}</cbc:IssueDate>
  <cbc:IssueTime>${new Date().toISOString().split("T")[1].split(".")[0]}</cbc:IssueTime>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${invoice.supplierVAT}</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${invoice.customerName}</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${invoice.customerVAT}</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">${invoice.vat}</cbc:TaxAmount>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:TaxExclusiveAmount currencyID="SAR">${(invoice.total || 0) - (invoice.vat || 0)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${invoice.total}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="SAR">${invoice.total}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;
  },

  signInvoice(xml: string): string {
    // Simulate ECDSA signature (SHA256)
    const simulatedSignature = btoa(xml.substring(0, 100) + Date.now());
    return simulatedSignature;
  },

  generateQRCode(invoice: Partial<ZATCAInvoice>): string {
    // TLV format for ZATCA QR Code
    const data = {
      sellerName: "ERPX Company",
      vatNumber: invoice.supplierVAT,
      timestamp: new Date().toISOString(),
      total: invoice.total,
      vat: invoice.vat,
    };

    // Simulate QR code as base64 data URL
    const qrData = btoa(JSON.stringify(data));
    return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
  },

  async submitToZATCA(invoice: ZATCAInvoice, retryCount = 0): Promise<{
    status: "cleared" | "reported" | "rejected";
    message: string;
  }> {
    // Simulate API call with random success/failure
    return new Promise((resolve) => {
      setTimeout(() => {
        const random = Math.random();

        if (random < 0.7) {
          // 70% success - cleared
          resolve({
            status: "cleared",
            message: "Invoice successfully cleared by ZATCA",
          });
        } else if (random < 0.9) {
          // 20% reported (warning)
          resolve({
            status: "reported",
            message: "Invoice reported with warnings",
          });
        } else {
          // 10% rejected
          resolve({
            status: "rejected",
            message: "Invoice rejected: Invalid VAT number format",
          });
        }
      }, 2000);
    });
  },

  async create(data: Omit<ZATCAInvoice, "id" | "uuid" | "xml" | "signature" | "qrCode" | "zatcaStatus" | "createdAt" | "retryCount">): Promise<ZATCAInvoice> {
    const uuid = this.generateUUID();
    const xml = this.generateXML({ ...data, uuid });
    const signature = this.signInvoice(xml);
    const qrCode = this.generateQRCode(data);

    const invoice: ZATCAInvoice = {
      ...data,
      id: this.nextId++,
      uuid,
      xml,
      signature,
      qrCode,
      zatcaStatus: "pending",
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    this.invoices.push(invoice);
    return new Promise((resolve) => setTimeout(() => resolve(invoice), 300));
  },

  async findAll(): Promise<ZATCAInvoice[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...this.invoices]), 300));
  },

  async updateStatus(id: number, status: ZATCAInvoice["zatcaStatus"], response: string): Promise<void> {
    const invoice = this.invoices.find((i) => i.id === id);
    if (invoice) {
      invoice.zatcaStatus = status;
      invoice.zatcaResponse = response;
      invoice.submittedAt = new Date().toISOString();
    }
    return new Promise((resolve) => setTimeout(() => resolve(), 300));
  },
};

export default function ZATCAPage() {
  const [invoices, setInvoices] = useState<ZATCAInvoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ZATCAInvoice | null>(null);
  const [submitting, setSubmitting] = useState<number | null>(null);

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerVAT, setCustomerVAT] = useState("");
  const [supplierVAT, setSupplierVAT] = useState("300000000000003");
  const [total, setTotal] = useState("1000");
  const [vat, setVat] = useState("150");

  const fetchInvoices = async () => {
    const data = await zatcaAPI.findAll();
    setInvoices(data);
  };

  const createInvoice = async () => {
    if (!invoiceNumber || !customerName || !customerVAT) return;

    await zatcaAPI.create({
      invoiceNumber,
      customerName,
      customerVAT,
      supplierVAT,
      total: Number(total),
      vat: Number(vat),
    });

    setInvoiceNumber("");
    setCustomerName("");
    setCustomerVAT("");
    setTotal("1000");
    setVat("150");
    setShowForm(false);
    fetchInvoices();
  };

  const submitToZATCA = async (invoice: ZATCAInvoice, retryCount = 0) => {
    setSubmitting(invoice.id);

    try {
      const response = await zatcaAPI.submitToZATCA(invoice, retryCount);

      if (response.status === "rejected" && retryCount < 3) {
        // Retry logic
        console.log(`Retry attempt ${retryCount + 1}/3 for invoice ${invoice.invoiceNumber}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return submitToZATCA(invoice, retryCount + 1);
      }

      await zatcaAPI.updateStatus(invoice.id, response.status, response.message);
      fetchInvoices();
    } catch (error) {
      console.error("ZATCA submission failed:", error);
    } finally {
      setSubmitting(null);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const getStatusColor = (status: ZATCAInvoice["zatcaStatus"]) => {
    switch (status) {
      case "cleared":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "reported":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const getStatusIcon = (status: ZATCAInvoice["zatcaStatus"]) => {
    switch (status) {
      case "cleared":
        return <CheckCircle className="w-4 h-4" />;
      case "reported":
        return <AlertTriangle className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white"
        >
          ZATCA E-Invoicing
        </motion.h1>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-green-500/30 transition-all flex items-center gap-2"
        >
          <FileText className="w-5 h-5" />
          New E-Invoice
        </motion.button>
      </div>

      {/* Process Flow */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/20 rounded-2xl p-6 mb-8"
      >
        <h3 className="text-lg font-bold text-white mb-4">ZATCA Integration Flow</h3>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          {[
            { icon: FileText, label: "Create Invoice" },
            { icon: Shield, label: "Generate XML (UBL)" },
            { icon: Shield, label: "Digital Sign (ECDSA)" },
            { icon: QrCode, label: "Generate QR" },
            { icon: Send, label: "Submit to ZATCA" },
            { icon: RefreshCw, label: "Retry (3x)" },
            { icon: CheckCircle, label: "Cleared/Reported" },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-2">
                <step.icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-xs text-gray-400">{step.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Create Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-6">Create ZATCA E-Invoice</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-2024-001"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Supplier VAT</label>
              <input
                type="text"
                value={supplierVAT}
                onChange={(e) => setSupplierVAT(e.target.value)}
                placeholder="300000000000003"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Abdullah Trading Co."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Customer VAT</label>
              <input
                type="text"
                value={customerVAT}
                onChange={(e) => setCustomerVAT(e.target.value)}
                placeholder="300000000000004"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Total Amount (SAR)</label>
              <input
                type="number"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">VAT Amount (15%)</label>
              <input
                type="number"
                value={vat}
                onChange={(e) => setVat(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createInvoice}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium"
            >
              Generate & Prepare Invoice
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowForm(false)}
              className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl"
            >
              Cancel
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Invoices Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">ZATCA E-Invoices</h2>
        </div>

        <div className="overflow-x-auto">
          {invoices.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              No e-invoices yet. Create your first ZATCA-compliant invoice above.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                    Invoice #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                    UUID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                    ZATCA Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice, i) => (
                  <motion.tr
                    key={invoice.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="px-6 py-4 text-sm text-blue-400 font-semibold">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">{invoice.customerName}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-white">
                      {invoice.total.toFixed(2)} SAR
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                      {invoice.uuid.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(
                          invoice.zatcaStatus
                        )}`}
                      >
                        {getStatusIcon(invoice.zatcaStatus)}
                        {invoice.zatcaStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {invoice.zatcaStatus === "pending" && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => submitToZATCA(invoice)}
                            disabled={submitting === invoice.id}
                            className="p-2 hover:bg-green-500/10 rounded-lg text-gray-400 hover:text-green-400 disabled:opacity-50"
                            title="Submit to ZATCA"
                          >
                            {submitting === invoice.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </motion.button>
                        )}

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setSelectedInvoice(invoice)}
                          className="p-2 hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-400"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            const blob = new Blob([invoice.xml], { type: "text/xml" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${invoice.invoiceNumber}.xml`;
                            a.click();
                          }}
                          className="p-2 hover:bg-purple-500/10 rounded-lg text-gray-400 hover:text-purple-400"
                          title="Download XML"
                        >
                          <Download className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedInvoice(null)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-gray-900 to-gray-950 border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Invoice Details</h2>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Invoice Number</p>
                  <p className="text-white font-semibold">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">UUID</p>
                  <p className="text-white font-mono text-xs">{selectedInvoice.uuid}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Customer</p>
                  <p className="text-white font-semibold">{selectedInvoice.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total</p>
                  <p className="text-white font-semibold">
                    {selectedInvoice.total.toFixed(2)} SAR
                  </p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="text-sm text-gray-400 mb-2">Digital Signature (ECDSA)</p>
                <p className="text-xs text-white font-mono bg-white/5 p-3 rounded-lg break-all">
                  {selectedInvoice.signature}
                </p>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="text-sm text-gray-400 mb-2">QR Code</p>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img
                    src={selectedInvoice.qrCode}
                    alt="QR Code"
                    className="w-32 h-32"
                  />
                </div>
              </div>

              {selectedInvoice.zatcaResponse && (
                <div className="border-t border-white/10 pt-4">
                  <p className="text-sm text-gray-400 mb-2">ZATCA Response</p>
                  <p className="text-white">{selectedInvoice.zatcaResponse}</p>
                </div>
              )}

              <div className="border-t border-white/10 pt-4">
                <p className="text-sm text-gray-400 mb-2">UBL XML</p>
                <pre className="text-xs text-white font-mono bg-white/5 p-3 rounded-lg overflow-x-auto max-h-64">
                  {selectedInvoice.xml}
                </pre>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
