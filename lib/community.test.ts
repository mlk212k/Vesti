import { describe, it, expect } from "vitest";
import {
  DISCORD_INVITE_URL,
  SOCIAL_NETWORKS,
  isDiscordInvite,
  isSocialUrl,
  openNetworks,
} from "./community";

describe("les réseaux configurés", () => {
  it("n'affiche que ceux qui ont une adresse", () => {
    // ⚠️ Le vrai contrat. Une adresse inventée « en attendant » mène à « ce
    // compte n'existe pas », ce qui donne l'impression d'une app abandonnée —
    // pire que pas de lien du tout. Un réseau sans adresse est simplement
    // absent de l'écran.
    for (const network of openNetworks()) {
      expect(network.url).not.toBeNull();
      expect(isSocialUrl(network.id, network.url)).toBe(true);
    }
  });

  it("garde toutes les adresses renseignées valides", () => {
    // Ce test ne dit PAS que les comptes existent — seul le réseau le sait, et
    // un compte peut être renommé. Il dit que la constante a la forme d'une
    // adresse de ce réseau : le jour où quelqu'un la recolle de travers, la
    // suite devient rouge au lieu d'envoyer tout le monde sur une erreur.
    for (const network of SOCIAL_NETWORKS) {
      if (network.url === null) continue;
      expect(isSocialUrl(network.id, network.url)).toBe(true);
    }
  });

  it("laisse le Discord ouvert", () => {
    expect(isDiscordInvite(DISCORD_INVITE_URL)).toBe(true);
    expect(openNetworks().some((n) => n.id === "discord")).toBe(true);
  });
});

describe("isSocialUrl", () => {
  it("accepte les deux formes d'invitation Discord", () => {
    expect(isSocialUrl("discord", "https://discord.gg/abcDEF12")).toBe(true);
    expect(isSocialUrl("discord", "https://discord.com/invite/abcDEF12")).toBe(true);
  });

  it("accepte un compte Instagram", () => {
    expect(isSocialUrl("instagram", "https://instagram.com/vesti.app")).toBe(true);
    expect(isSocialUrl("instagram", "https://www.instagram.com/vesti_app")).toBe(true);
  });

  it("exige l'arobase sur TikTok", () => {
    // ⚠️ Sans elle, `tiktok.com/vesti` mène à une recherche, pas au compte —
    // et ça ressemble tellement à une adresse valable que personne ne le
    // remarquerait à la relecture.
    expect(isSocialUrl("tiktok", "https://tiktok.com/@vesti")).toBe(true);
    expect(isSocialUrl("tiktok", "https://tiktok.com/vesti")).toBe(false);
  });

  it("refuse le HTTP en clair", () => {
    expect(isSocialUrl("instagram", "http://instagram.com/vesti")).toBe(false);
    expect(isSocialUrl("discord", "http://discord.gg/abcDEF12")).toBe(false);
  });

  it("refuse un domaine qui RESSEMBLE au bon", () => {
    // Le cas qui compte : personne ne relit deux fois une adresse plausible.
    expect(isSocialUrl("discord", "https://discord.gg.exemple.com/abcDEF12")).toBe(false);
    expect(isSocialUrl("instagram", "https://instagram.com.exemple.fr/vesti")).toBe(false);
    expect(isSocialUrl("tiktok", "https://exemple.com/tiktok.com/@vesti")).toBe(false);
  });

  it("refuse une adresse sans compte", () => {
    expect(isSocialUrl("instagram", "https://instagram.com/")).toBe(false);
    expect(isSocialUrl("tiktok", "https://tiktok.com/@")).toBe(false);
    expect(isSocialUrl("discord", "https://discord.gg/")).toBe(false);
  });

  it("refuse ce qui n'est pas une adresse", () => {
    expect(isSocialUrl("instagram", "instagram.com/vesti")).toBe(false);
    expect(isSocialUrl("tiktok", "")).toBe(false);
  });

  it("ne confond pas les réseaux entre eux", () => {
    expect(isSocialUrl("instagram", DISCORD_INVITE_URL)).toBe(false);
    expect(isSocialUrl("tiktok", "https://instagram.com/vesti")).toBe(false);
  });
});
