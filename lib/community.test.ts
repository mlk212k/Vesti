import { describe, it, expect } from "vitest";
import { DISCORD_INVITE_URL, isDiscordInvite } from "./community";

describe("le lien du Discord", () => {
  it("est une invitation valide", () => {
    // ⚠️ Ce test ne dit PAS que l'invitation fonctionne — ça, seul Discord le
    // sait, et une invitation peut expirer sans que rien ici ne change. Il dit
    // que la constante a la forme d'une invitation : le jour où quelqu'un la
    // recolle de travers, la suite devient rouge au lieu d'envoyer tous les
    // nouveaux inscrits sur une page d'erreur.
    expect(isDiscordInvite(DISCORD_INVITE_URL)).toBe(true);
  });
});

describe("isDiscordInvite", () => {
  it("accepte les deux formes que Discord distribue", () => {
    expect(isDiscordInvite("https://discord.gg/abcDEF12")).toBe(true);
    expect(isDiscordInvite("https://discord.com/invite/abcDEF12")).toBe(true);
  });

  it("refuse le HTTP en clair", () => {
    // Depuis une app installée, un lien en clair déclenche l'avertissement du
    // navigateur — juste au moment où l'on demande à quelqu'un de faire
    // confiance et de rejoindre.
    expect(isDiscordInvite("http://discord.gg/abcDEF12")).toBe(false);
  });

  it("refuse un autre domaine", () => {
    // Le cas qui compte : un lien qui RESSEMBLE à Discord. Personne ne le
    // relirait deux fois dans une revue de code.
    expect(isDiscordInvite("https://discord.gg.example.com/abcDEF12")).toBe(false);
    expect(isDiscordInvite("https://example.com/discord.gg/abcDEF12")).toBe(false);
  });

  it("refuse une invitation sans code", () => {
    expect(isDiscordInvite("https://discord.gg/")).toBe(false);
    expect(isDiscordInvite("https://discord.gg/a")).toBe(false);
  });

  it("refuse ce qui n'est pas une adresse", () => {
    expect(isDiscordInvite("discord.gg/abcDEF12")).toBe(false);
    expect(isDiscordInvite("")).toBe(false);
  });
});
