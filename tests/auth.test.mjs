import assert from "node:assert/strict";
import test from "node:test";
import { isSameOrigin } from "../lib/auth.js";

test("same-origin validation accepts the configured and serving origins", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  try {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example.com";

    assert.equal(
      isSameOrigin(
        new Request("https://rsu-mart.vercel.app/api/auth/register", {
          headers: { origin: "https://rsu-mart.vercel.app" },
        }),
      ),
      true,
    );
    assert.equal(
      isSameOrigin(
        new Request("https://rsu-mart.vercel.app/api/auth/register", {
          headers: { origin: "https://shop.example.com" },
        }),
      ),
      true,
    );
    assert.equal(
      isSameOrigin(
        new Request("https://rsu-mart.vercel.app/api/auth/register", {
          headers: { origin: "https://attacker.example" },
        }),
      ),
      false,
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
  }
});

test("same-origin validation requires an origin and production site URL", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  try {
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_SITE_URL;

    assert.equal(
      isSameOrigin(new Request("https://rsu-mart.vercel.app/api/auth/register")),
      false,
    );
    assert.equal(
      isSameOrigin(
        new Request("https://rsu-mart.vercel.app/api/auth/register", {
          headers: { origin: "https://rsu-mart.vercel.app" },
        }),
      ),
      false,
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
  }
});
