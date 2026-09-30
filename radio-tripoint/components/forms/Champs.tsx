"use client"

import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react"
import { cn } from "@/lib/utils/cn"
import { useErreurChamp } from "./Formulaire"

function Cadre({
  id,
  libelle,
  aide,
  erreur,
  facultatif,
  children,
  className,
}: {
  id: string
  libelle: string
  aide?: string
  erreur?: string
  facultatif?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="etiquette">
        {libelle}
        {facultatif && <span className="text-encre-3 ml-1.5 font-normal">(facultatif)</span>}
      </label>
      {children}
      {aide && !erreur && (
        <p id={`${id}-aide`} className="text-encre-3 mt-1.5 text-xs">
          {aide}
        </p>
      )}
      {erreur && (
        <p id={`${id}-erreur`} className="text-alerte mt-1.5 text-sm font-medium">
          {erreur}
        </p>
      )}
    </div>
  )
}

type Base = {
  name: string
  libelle: string
  aide?: string
  facultatif?: boolean
  className?: string
}

export function ChampTexte({
  name,
  libelle,
  aide,
  facultatif,
  className,
  ...p
}: Base & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  const erreur = useErreurChamp(name)
  return (
    <Cadre
      id={id}
      libelle={libelle}
      aide={aide}
      erreur={erreur}
      facultatif={facultatif}
      className={className}
    >
      <input
        id={id}
        name={name}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined}
        aria-required={!facultatif}
        className="champ"
        {...p}
      />
    </Cadre>
  )
}

export function ChampZone({
  name,
  libelle,
  aide,
  facultatif,
  className,
  ...p
}: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  const erreur = useErreurChamp(name)
  return (
    <Cadre
      id={id}
      libelle={libelle}
      aide={aide}
      erreur={erreur}
      facultatif={facultatif}
      className={className}
    >
      <textarea
        id={id}
        name={name}
        rows={6}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined}
        aria-required={!facultatif}
        className="champ min-h-36 resize-y"
        {...p}
      />
    </Cadre>
  )
}

export function ChampChoix({
  name,
  libelle,
  aide,
  facultatif,
  className,
  options,
  ...p
}: Base & SelectHTMLAttributes<HTMLSelectElement> & { options: readonly string[] }) {
  const id = useId()
  const erreur = useErreurChamp(name)
  return (
    <Cadre
      id={id}
      libelle={libelle}
      aide={aide}
      erreur={erreur}
      facultatif={facultatif}
      className={className}
    >
      <select
        id={id}
        name={name}
        defaultValue=""
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${id}-erreur` : undefined}
        aria-required={!facultatif}
        className="champ appearance-none bg-[length:1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b6f76' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...p}
      >
        <option value="" disabled>
          Choisir…
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Cadre>
  )
}

export function ChampFichier({
  name,
  libelle,
  aide,
  className,
  accept,
}: Base & { accept: string }) {
  const id = useId()
  const erreur = useErreurChamp(name)
  return (
    <Cadre id={id} libelle={libelle} aide={aide} erreur={erreur} facultatif className={className}>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined}
        className="champ file:bg-encre file:text-papier cursor-pointer py-2.5 text-sm file:mr-4 file:cursor-pointer file:rounded-sm file:border-0 file:px-3 file:py-1.5 file:text-sm file:font-semibold"
      />
    </Cadre>
  )
}

export function CaseConsentement({
  name = "consentement",
  children,
  className,
}: {
  name?: string
  children: ReactNode
  className?: string
}) {
  const id = useId()
  const erreur = useErreurChamp(name)
  return (
    <div className={cn("mt-6", className)}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          name={name}
          type="checkbox"
          value="oui"
          aria-invalid={erreur ? true : undefined}
          aria-describedby={erreur ? `${id}-erreur` : undefined}
          className="mt-0.5 size-5 flex-none cursor-pointer accent-[var(--accent)]"
        />
        <label htmlFor={id} className="text-encre-2 cursor-pointer text-sm leading-relaxed">
          {children}
        </label>
      </div>
      {erreur && (
        <p id={`${id}-erreur`} className="text-alerte mt-1.5 ml-8 text-sm font-medium">
          {erreur}
        </p>
      )}
    </div>
  )
}
