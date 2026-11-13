import { useEffect, useRef, useState } from "react";
import { Field } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../components/ui/Toast";
import { saveReport } from "../../lib/db";
import { compressImage } from "../../lib/images";
import type { Motor, MotorStep, SessionUser } from "../../lib/types";

const MAX_PHOTOS = 5;
const MAX_SIZE = 15 * 1024 * 1024;

/** Photo compressée (1600 px, JPEG 0.8) + aperçu local. Envoi vers Firebase Storage à la validation. */
interface PendingPhoto {
  blob: Blob;
  preview: string;
}

interface Props {
  motor: Motor;
  step: MotorStep | null;
  user: SessionUser;
  onClose: () => void;
  onSent: () => void;
}

export function ReportFormModal({ motor, step, user, onClose, onSent }: Props) {
  const notify = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const [measurements, setMeasurements] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const clearPhotos = () => {
    photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotos([]);
  };

  useEffect(() => {
    if (!step) return;
    setDescription("");
    setMeasurements("");
    clearPhotos();
  }, [step]);

  // libère les aperçus à la fermeture du composant
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  const addFiles = async (files: FileList | null) => {
    let room = MAX_PHOTOS - photos.length;
    const added: PendingPhoto[] = [];
    for (const file of Array.from(files ?? [])) {
      if (room <= 0) {
        notify("Max 5 photos", "warning");
        break;
      }
      if (file.size > MAX_SIZE) {
        notify("Max 15 Mo par photo", "warning");
        continue;
      }
      try {
        const blob = await compressImage(file);
        added.push({ blob, preview: URL.createObjectURL(blob) });
        room--;
      } catch {
        notify(`Image illisible : ${file.name}`, "warning");
      }
    }
    setPhotos((p) => [...p, ...added].slice(0, MAX_PHOTOS));
    if (fileInput.current) fileInput.current.value = "";
  };

  const send = async () => {
    if (!step) return;
    if (!description.trim() && !photos.length) {
      notify("Ajoutez une description ou photo", "warning");
      return false;
    }
    try {
      const saved = await saveReport(
        {
          motorId: motor.id,
          stepId: step.id,
          stepName: step.name,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          motorClient: motor.clientName || "",
          motorPower: motor.power || "",
          motorType: motor.motorType || "",
          description,
          measurements,
        },
        photos.map((p) => p.blob),
      );
      if (saved.photoStorage === "inline") notify("Photos enregistrées en qualité réduite (stockage en ligne indisponible)", "warning");
    } catch (e) {
      console.error(e);
      notify("Envoi du rapport impossible", "error");
      return false;
    }
    clearPhotos();
    onSent();
  };

  return (
    <Modal open={!!step} onClose={onClose} title="Envoyer rapport" icon="camera" wide confirmText="Envoyer" onConfirm={send}>
      <h4 className="mb-1 font-semibold text-primary">Rapport : {step?.name}</h4>
      <p className="mb-4 text-ink-2">
        Moteur : {motor.clientName || "-"} | {motor.power || "-"} kW
      </p>
      <Field label="Description" htmlFor="rp-desc">
        <textarea id="rp-desc" rows={4} className="field-input" placeholder="Décrivez..." value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label={`Photos (max ${MAX_PHOTOS})`} htmlFor="rp-photos">
        <input ref={fileInput} id="rp-photos-file" type="file" accept="image/*" multiple hidden aria-hidden tabIndex={-1} onChange={(e) => addFiles(e.target.files)} />
        {photos.length < MAX_PHOTOS && (
          <button
            id="rp-photos"
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-line-strong bg-canvas px-4 py-6 text-ink-2 transition hover:border-primary hover:bg-primary-soft hover:text-primary-dark"
          >
            <Icon name="cloud-upload-alt" className="text-2xl" />
            <span>Cliquez pour ajouter</span>
          </button>
        )}
        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p.preview} alt={`Photo ${i + 1}`} className="aspect-square w-full rounded-lg border border-line object-cover" />
                <button
                  type="button"
                  aria-label={`Retirer la photo ${i + 1}`}
                  onClick={() => {
                    URL.revokeObjectURL(p.preview);
                    setPhotos((list) => list.filter((_, j) => j !== i));
                  }}
                  className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-danger text-xs text-white shadow"
                >
                  <Icon name="times" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Field>
      <Field label="Mesures" htmlFor="rp-meas">
        <textarea id="rp-meas" rows={3} className="field-input font-mono" placeholder="Résistance..." value={measurements} onChange={(e) => setMeasurements(e.target.value)} />
      </Field>
    </Modal>
  );
}
