"use client";

import { useState, useEffect, useRef, type ComponentType } from "react";
import { FileText, Shield, ScanSearch, File, Plus, Trash2, Download } from "lucide-react";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { getFirebaseStorage } from "@/lib/firebase";
import {
  getTravelDocuments,
  createTravelDocument,
  deleteTravelDocumentDoc,
} from "@/lib/firestore";
import type { CSSProperties } from "react";
import type { TravelDocument, TravelDocumentType } from "@/lib/types";
import { TopNav } from "@/components/TopNav";
import { BottomNav } from "@/components/BottomNav";

// MARK: - Config

type LucideIcon = ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: CSSProperties }>;

const DOC_TYPES: { type: TravelDocumentType; label: string; icon: LucideIcon }[] = [
  { type: "passport", label: "Pasaporte", icon: ScanSearch },
  { type: "visa", label: "Visa", icon: FileText },
  { type: "insurance", label: "Seguro", icon: Shield },
  { type: "other", label: "Otro", icon: File },
];

const TYPE_COLORS: Record<TravelDocumentType, string> = {
  passport: "#4D96FF",
  visa: "#71D3A6",
  insurance: "#F29E7D",
  other: "#81786A",
};

function typeConfig(type: TravelDocumentType) {
  return DOC_TYPES.find((t) => t.type === type) ?? DOC_TYPES[3];
}

function expiryLabel(expiresAt: string): { text: string; color: string } {
  const today = new Date();
  const exp = new Date(expiresAt);
  const days = Math.round((exp.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { text: "Vencido", color: "#E54B4B" };
  if (days === 0) return { text: "Vence hoy", color: "#E54B4B" };
  if (days === 1) return { text: "Vence mañana", color: "#F29E7D" };
  if (days < 30) return { text: `Vence en ${days} días`, color: "#F29E7D" };
  if (days < 365) return { text: `Vence en ${Math.floor(days / 30)} meses`, color: "#81786A" };
  return { text: `Vence en ${Math.floor(days / 365)} años`, color: "#81786A" };
}

// MARK: - Page

export function TravelDocumentsPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<TravelDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!user) return;
    getTravelDocuments(user.uid).then((d) => {
      setDocs(d);
      setLoading(false);
    });
  }, [user]);

  async function handleDelete(doc: TravelDocument) {
    if (!user) return;
    if (!confirm(`¿Eliminar "${doc.title}"?`)) return;
    try {
      const storageRef = ref(getFirebaseStorage(), doc.storage_ref);
      await deleteObject(storageRef).catch(() => {});
      await deleteTravelDocumentDoc(user.uid, doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch {
      alert("No se pudo eliminar el documento.");
    }
  }

  async function handleDownload(doc: TravelDocument) {
    try {
      const storageRef = ref(getFirebaseStorage(), doc.storage_ref);
      const url = await getDownloadURL(storageRef);
      window.open(url, "_blank");
    } catch {
      alert("No se pudo descargar el archivo.");
    }
  }

  function handleAdded(newDoc: TravelDocument) {
    setDocs((prev) => [newDoc, ...prev]);
    setShowAdd(false);
  }

  return (
    <div className="min-h-screen" style={{ background: "#090806" }}>
      <TopNav active="settings" />

      <main className="max-w-lg mx-auto px-4 pt-20 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-xl font-bold tracking-tight"
              style={{ color: "#F5F0E8", fontFamily: "'SF Pro Display', system-ui, sans-serif" }}
            >
              Documentos de viaje
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "#81786A" }}>
              Pasaportes, visas y seguros
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: "rgba(77,150,255,0.15)", color: "#4D96FF" }}
          >
            <Plus size={15} strokeWidth={2.5} />
            Agregar
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div
              className="w-6 h-6 rounded-full border-2 animate-spin"
              style={{ borderColor: "#333 #333 #4D96FF #333" }}
            />
          </div>
        ) : docs.length === 0 ? (
          <EmptyState onAdd={() => setShowAdd(true)} />
        ) : (
          <div className="flex flex-col gap-3">
            {docs.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                onDelete={() => handleDelete(doc)}
                onDownload={() => handleDownload(doc)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add sheet */}
      {showAdd && user && (
        <AddDocumentSheet
          uid={user.uid}
          onClose={() => setShowAdd(false)}
          onAdded={handleAdded}
        />
      )}

      <BottomNav active="settings" onAdd={() => setShowAdd(true)} />
    </div>
  );
}

// MARK: - Empty state

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center py-16 gap-4">
      <div style={{ color: "#333" }}>
        <FileText size={48} strokeWidth={1.2} />
      </div>
      <div className="text-center">
        <p className="font-semibold text-base" style={{ color: "#F5F0E8" }}>
          Sin documentos
        </p>
        <p className="text-sm mt-1" style={{ color: "#81786A" }}>
          Guardá pasaportes, visas y seguros<br />para tenerlos a mano cuando viajás.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
        style={{ background: "rgba(77,150,255,0.12)", color: "#4D96FF" }}
      >
        <Plus size={15} strokeWidth={2.5} />
        Agregar documento
      </button>
    </div>
  );
}

// MARK: - Document row

function DocumentRow({
  doc,
  onDelete,
  onDownload,
}: {
  doc: TravelDocument;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const cfg = typeConfig(doc.type);
  const Icon = cfg.icon;
  const color = TYPE_COLORS[doc.type];
  const expiry = doc.expires_at ? expiryLabel(doc.expires_at) : null;

  return (
    <div
      className="flex items-center gap-3 p-4 rounded-xl"
      style={{
        background: "#171717",
        border: "1px solid #1E1E1E",
      }}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center w-11 h-11 rounded-lg flex-shrink-0"
        style={{ background: `${color}1A` }}
      >
        <Icon size={20} strokeWidth={1.8} style={{ color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: "#F5F0E8" }}>
          {doc.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
            {cfg.label}
          </span>
          {expiry && (
            <>
              <span style={{ color: "#333" }}>·</span>
              <span className="text-xs" style={{ color: expiry.color }}>
                {expiry.text}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onDownload}
          className="p-2 rounded-lg transition-colors hover:bg-white/5"
          title="Ver / descargar"
        >
          <Download size={16} strokeWidth={1.8} style={{ color: "#81786A" }} />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg transition-colors hover:bg-red-500/10"
          title="Eliminar"
        >
          <Trash2 size={16} strokeWidth={1.8} style={{ color: "#81786A" }} />
        </button>
      </div>
    </div>
  );
}

// MARK: - Add sheet

function AddDocumentSheet({
  uid,
  onClose,
  onAdded,
}: {
  uid: string;
  onClose: () => void;
  onAdded: (doc: TravelDocument) => void;
}) {
  const [docType, setDocType] = useState<TravelDocumentType>("passport");
  const [title, setTitle] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSave = title.trim().length > 0 && file !== null && !saving;

  async function handleSave() {
    if (!file || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const uniqueName = `${crypto.randomUUID()}_${file.name}`;
      const storagePath = `users/${uid}/documents/${uniqueName}`;
      const storageRef = ref(getFirebaseStorage(), storagePath);
      const metadata = { contentType: file.type };
      await uploadBytes(storageRef, file, metadata);

      const data: Omit<TravelDocument, "id"> = {
        type: docType,
        title: title.trim(),
        storage_ref: storagePath,
        file_name: file.name,
        mime_type: file.type,
        expires_at: expiresAt || undefined,
        notes: notes || undefined,
        created_at: serverTimestamp() as TravelDocument["created_at"],
      };
      const newId = await createTravelDocument(uid, data);
      onAdded({ ...data, id: newId });
    } catch {
      setError("No se pudo guardar el documento. Intentá de nuevo.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg rounded-t-2xl md:rounded-2xl overflow-hidden"
        style={{ background: "#111" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #1E1E1E" }}
        >
          <button onClick={onClose} className="text-sm" style={{ color: "#81786A" }}>
            Cancelar
          </button>
          <h2 className="text-sm font-semibold" style={{ color: "#F5F0E8" }}>
            Nuevo documento
          </h2>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="text-sm font-semibold transition-opacity disabled:opacity-40"
            style={{ color: "#4D96FF" }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-5 max-h-[80vh] overflow-y-auto pb-8">
          {/* Type selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#81786A" }}>
              Tipo
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DOC_TYPES.map(({ type, label, icon: Icon }) => {
                const active = docType === type;
                const color = TYPE_COLORS[type];
                return (
                  <button
                    key={type}
                    onClick={() => setDocType(type)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-colors"
                    style={{
                      background: active ? `${color}18` : "#1A1A1A",
                      color: active ? color : "#81786A",
                      border: `1px solid ${active ? `${color}44` : "#333"}`,
                    }}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <FormField label="Nombre">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Pasaporte vence 2031"
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: "#F5F0E8" }}
            />
          </FormField>

          {/* File */}
          <FormField label="Archivo">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 text-sm"
              style={{ color: file ? "#F5F0E8" : "#4D96FF" }}
            >
              <FileText size={15} strokeWidth={1.8} />
              {file ? file.name : "Seleccionar PDF o imagen"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
                }
              }}
            />
          </FormField>

          {/* Expiry */}
          <FormField label="Vencimiento (opcional)">
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: expiresAt ? "#F5F0E8" : "#81786A", colorScheme: "dark" }}
            />
          </FormField>

          {/* Notes */}
          <FormField label="Notas (opcional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales"
              rows={2}
              className="w-full bg-transparent outline-none text-sm resize-none"
              style={{ color: "#F5F0E8" }}
            />
          </FormField>

          {error && (
            <p className="text-sm text-center" style={{ color: "#E54B4B" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#81786A" }}>
        {label}
      </label>
      <div
        className="px-4 py-3 rounded-xl"
        style={{ background: "#1A1A1A", border: "1px solid #262626" }}
      >
        {children}
      </div>
    </div>
  );
}
