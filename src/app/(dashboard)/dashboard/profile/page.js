"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Input, Toggle } from "@/shared/components";
import { Card } from "@/shared/tailgrids/core/card";
import Modal, { ConfirmModal } from "@/shared/components/Modal";
import { useTheme } from "@/shared/hooks/useTheme";
import { useClientValue } from "@/shared/hooks/useClientValue";
import { cnx } from "@/shared/utils/cn";
import { ACCENT_SWATCHES, APP_CONFIG, THEME_CONFIG } from "@/shared/constants/config";
import { resolveSidebarItems, SIDEBAR_ITEMS } from "@/shared/constants/sidebarItems";
import useSettingsStore from "@/store/settingsStore";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import Icon from "@/shared/components/Icon";

const SETTINGS_TABS = [
  { key: "appearance", label: "Appearance" },
  { key: "security", label: "Security" },
  { key: "network", label: "Network" },
  { key: "advanced", label: "Advanced" },
];

export default function ProfilePage() {
  const { accent, setAccent } = useTheme();
  const [settingsTab, setSettingsTab] = useState("appearance");
  const [shutdownOpen, setShutdownOpen] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [settings, setSettings] = useState({ fallbackStrategy: "fill-first" });
  const [loading, setLoading] = useState(true);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [passStatus, setPassStatus] = useState({ type: "", message: "" });
  const [passLoading, setPassLoading] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState({ type: "", message: "" });
  const [dbAuth, setDbAuth] = useState({ open: false, mode: "", password: "" });
  const pendingImportRef = useRef(null);
  const [oidcForm, setOidcForm] = useState({
    authMode: "password",
    oidcIssuerUrl: "",
    oidcClientId: "",
    oidcScopes: "openid profile email",
    oidcLoginLabel: "Sign in with OIDC",
  });
  const [oidcClientSecret, setOidcClientSecret] = useState("");
  const [oidcStatus, setOidcStatus] = useState({ type: "", message: "" });
  const [oidcLoading, setOidcLoading] = useState(false);
  const [oidcTestLoading, setOidcTestLoading] = useState(false);
  const [oidcTestStatus, setOidcTestStatus] = useState({ type: "", message: "" });
  const [oidcExpanded, setOidcExpanded] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const oidcRedirectUri = origin ? `${origin}/api/auth/oidc/callback` : "/api/auth/oidc/callback";
  const samlAcsUrl = origin ? `${origin}/api/auth/saml/acs` : "/api/auth/saml/acs";
  const samlMetadataUrl = origin ? `${origin}/api/auth/saml/metadata` : "/api/auth/saml/metadata";
  
  // SAML State
  const [ssoTypeTab, setSsoTypeTab] = useState("saml");
  const [samlForm, setSamlForm] = useState({
    samlEntryPoint: "",
    samlIssuer: "urn:9router:sp",
    samlCert: "",
    samlLoginLabel: "Sign in with SAML SSO",
    samlAttributeEmail: "email",
    samlAttributeName: "name",
  });
  const [samlStatus, setSamlStatus] = useState({ type: "", message: "" });
  const [samlLoading, setSamlLoading] = useState(false);
  const [samlTestLoading, setSamlTestLoading] = useState(false);
  const [samlTestStatus, setSamlTestStatus] = useState({ type: "", message: "" });
  const [showSamlGuide, setShowSamlGuide] = useState(false);
  const idpMetadataFileRef = useRef(null);
  const certFileRef = useRef(null);

  const importFileRef = useRef(null);
  const [proxyForm, setProxyForm] = useState({
    outboundProxyEnabled: false,
    outboundProxyUrl: "",
    outboundNoProxy: "",
  });
  const [proxyStatus, setProxyStatus] = useState({ type: "", message: "" });
  const [proxyLoading, setProxyLoading] = useState(false);
  const [proxyTestLoading, setProxyTestLoading] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ enabled: true, url: "" });
  const [webhookStatus, setWebhookStatus] = useState({ type: "", message: "" });
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookTestLoading, setWebhookTestLoading] = useState(false);

  const isRemoteHost = useClientValue(
    () => !["localhost", "127.0.0.1", "::1"].includes(window.location.hostname),
    false,
  );

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setOidcForm({
          authMode: data?.authMode || "password",
          oidcIssuerUrl: data?.oidcIssuerUrl || "",
          oidcClientId: data?.oidcClientId || "",
          oidcScopes: data?.oidcScopes || "openid profile email",
          oidcLoginLabel: data?.oidcLoginLabel || "Sign in with OIDC",
        });
        setOidcClientSecret("");
        setSsoTypeTab(data?.ssoType || "saml");
        setSamlForm({
          samlEntryPoint: data?.samlEntryPoint || "",
          samlIssuer: data?.samlIssuer || "urn:9router:sp",
          samlCert: data?.samlCert || "",
          samlLoginLabel: data?.samlLoginLabel || "Sign in with SAML SSO",
          samlAttributeEmail: data?.samlAttributeEmail || "email",
          samlAttributeName: data?.samlAttributeName || "name",
        });
        if (
          data?.authMode === "sso" ||
          data?.authMode === "saml" ||
          data?.authMode === "oidc" ||
          data?.authMode === "both"
        ) {
          setOidcExpanded(true);
        }
        setProxyForm({
          outboundProxyEnabled: data?.outboundProxyEnabled === true,
          outboundProxyUrl: data?.outboundProxyUrl || "",
          outboundNoProxy: data?.outboundNoProxy || "",
        });
        setWebhookForm({
          enabled: data?.discordWebhookEnabled !== false,
          url: data?.discordWebhookUrl || "",
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch settings:", err);
        setLoading(false);
      });
  }, []);

  const updateOutboundProxy = async (e) => {
    e.preventDefault();
    if (settings.outboundProxyEnabled !== true) return;
    setProxyLoading(true);
    setProxyStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outboundProxyUrl: proxyForm.outboundProxyUrl,
          outboundNoProxy: proxyForm.outboundNoProxy,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSettings((prev) => ({ ...prev, ...data }));
        setProxyStatus({ type: "success", message: "Proxy settings applied" });
      } else {
        setProxyStatus({ type: "error", message: data.error || "Failed to update proxy settings" });
      }
    } catch (err) {
      setProxyStatus({ type: "error", message: "An error occurred" });
    } finally {
      setProxyLoading(false);
    }
  };

  const testOutboundProxy = async () => {
    if (settings.outboundProxyEnabled !== true) return;

    const proxyUrl = (proxyForm.outboundProxyUrl || "").trim();
    if (!proxyUrl) {
      setProxyStatus({ type: "error", message: "Please enter a Proxy URL to test" });
      return;
    }

    setProxyTestLoading(true);
    setProxyStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/settings/proxy-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proxyUrl }),
      });

      const data = await res.json();
      if (res.ok && data?.ok) {
        setProxyStatus({
          type: "success",
          message: `Proxy test OK (${data.status}) in ${data.elapsedMs}ms`,
        });
      } else {
        setProxyStatus({
          type: "error",
          message: data?.error || "Proxy test failed",
        });
      }
    } catch (err) {
      setProxyStatus({ type: "error", message: "An error occurred" });
    } finally {
      setProxyTestLoading(false);
    }
  };

  const updateOutboundProxyEnabled = async (outboundProxyEnabled) => {
    setProxyLoading(true);
    setProxyStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outboundProxyEnabled }),
      });

      const data = await res.json();
      if (res.ok) {
        setSettings((prev) => ({ ...prev, ...data }));
        setProxyForm((prev) => ({ ...prev, outboundProxyEnabled: data?.outboundProxyEnabled === true }));
        setProxyStatus({
          type: "success",
          message: outboundProxyEnabled ? "Proxy enabled" : "Proxy disabled",
        });
      } else {
        setProxyStatus({ type: "error", message: data.error || "Failed to update proxy settings" });
      }
    } catch (err) {
      setProxyStatus({ type: "error", message: "An error occurred" });
    } finally {
      setProxyLoading(false);
    }
  };

  const saveWebhook = async (e) => {
    e.preventDefault();
    setWebhookLoading(true);
    setWebhookStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discordWebhookUrl: (webhookForm.url || "").trim(),
          discordWebhookEnabled: webhookForm.enabled === true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSettings((prev) => ({ ...prev, ...data }));
        setWebhookForm({
          enabled: data?.discordWebhookEnabled !== false,
          url: data?.discordWebhookUrl || "",
        });
        setWebhookStatus({ type: "success", message: "Webhook saved" });
      } else {
        setWebhookStatus({ type: "error", message: data.error || "Failed to save webhook" });
      }
    } catch (err) {
      setWebhookStatus({ type: "error", message: "An error occurred" });
    } finally {
      setWebhookLoading(false);
    }
  };

  const testWebhook = async () => {
    setWebhookTestLoading(true);
    setWebhookStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/settings/webhook-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: (webhookForm.url || "").trim() || undefined }),
      });

      const data = await res.json();
      if (res.ok && data?.ok) {
        setWebhookStatus({
          type: "success",
          message: `Test message sent${data?.source ? ` (source: ${data.source})` : ""}`,
        });
      } else {
        setWebhookStatus({ type: "error", message: data?.error || "Webhook test failed" });
      }
    } catch (err) {
      setWebhookStatus({ type: "error", message: "An error occurred" });
    } finally {
      setWebhookTestLoading(false);
    }
  };

  const updateWebhookEnabled = async (discordWebhookEnabled) => {
    setWebhookLoading(true);
    setWebhookStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordWebhookEnabled }),
      });

      const data = await res.json();
      if (res.ok) {
        setSettings((prev) => ({ ...prev, ...data }));
        setWebhookForm((prev) => ({ ...prev, enabled: data?.discordWebhookEnabled !== false }));
        setWebhookStatus({
          type: "success",
          message: discordWebhookEnabled ? "Webhook notifications enabled" : "Webhook notifications disabled",
        });
      } else {
        setWebhookStatus({ type: "error", message: data.error || "Failed to update webhook" });
      }
    } catch (err) {
      setWebhookStatus({ type: "error", message: "An error occurred" });
    } finally {
      setWebhookLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setPassStatus({ type: "error", message: "Passwords do not match" });
      return;
    }

    setPassLoading(true);
    setPassStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setPassStatus({ type: "success", message: "Password updated successfully" });
        setPasswords({ current: "", new: "", confirm: "" });
      } else {
        setPassStatus({ type: "error", message: data.error || "Failed to update password" });
      }
    } catch (err) {
      setPassStatus({ type: "error", message: "An error occurred" });
    } finally {
      setPassLoading(false);
    }
  };

  const updateFallbackStrategy = async (strategy) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fallbackStrategy: strategy }),
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, fallbackStrategy: strategy }));
      }
    } catch (err) {
      console.error("Failed to update settings:", err);
    }
  };

  const updateComboStrategy = async (strategy) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comboStrategy: strategy }),
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, comboStrategy: strategy }));
      }
    } catch (err) {
      console.error("Failed to update combo strategy:", err);
    }
  };

  const updateStickyLimit = async (limit) => {
    const numLimit = parseInt(limit);
    if (isNaN(numLimit) || numLimit < 1) return;

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stickyRoundRobinLimit: numLimit }),
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, stickyRoundRobinLimit: numLimit }));
      }
    } catch (err) {
      console.error("Failed to update sticky limit:", err);
    }
  };

  const updateComboStickyLimit = async (limit) => {
    const numLimit = parseInt(limit);
    if (isNaN(numLimit) || numLimit < 1) return;

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comboStickyRoundRobinLimit: numLimit }),
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, comboStickyRoundRobinLimit: numLimit }));
      }
    } catch (err) {
      console.error("Failed to update combo sticky limit:", err);
    }
  };

  const updateRequireLogin = async (requireLogin) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireLogin }),
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, requireLogin }));
      }
    } catch (err) {
      console.error("Failed to update require login:", err);
    }
  };

  const updateOidcForm = (field, value) => {
    setOidcForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveOidcSettings = async (authMode = oidcForm.authMode || "password") => {
    const issuerUrl = oidcForm.oidcIssuerUrl.trim();
    const clientId = oidcForm.oidcClientId.trim();
    const scopes = oidcForm.oidcScopes.trim();
    const loginLabel = oidcForm.oidcLoginLabel.trim();
    const secret = oidcClientSecret.trim();

    if (authMode !== "password" && (!issuerUrl || !clientId || !secret) && !settings.oidcConfigured) {
      setOidcStatus({ type: "error", message: "Issuer URL, client ID, and client secret are required to enable OIDC." });
      return;
    }

    setOidcLoading(true);
    setOidcStatus({ type: "", message: "" });
    setOidcTestStatus({ type: "", message: "" });

    try {
      const payload = {
        authMode,
        ssoType: "oidc",
        oidcIssuerUrl: issuerUrl,
        oidcClientId: clientId,
        oidcScopes: scopes || "openid profile email",
        oidcLoginLabel: loginLabel || "Sign in with OIDC",
      };
      if (secret) {
        payload.oidcClientSecret = secret;
      }

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setSettings((prev) => ({ ...prev, ...data }));
        setOidcForm({
          authMode: data?.authMode || authMode,
          oidcIssuerUrl: data?.oidcIssuerUrl || issuerUrl,
          oidcClientId: data?.oidcClientId || clientId,
          oidcScopes: data?.oidcScopes || scopes || "openid profile email",
          oidcLoginLabel: data?.oidcLoginLabel || loginLabel || "Sign in with OIDC",
        });
        setOidcClientSecret("");
        setOidcStatus({
          type: "success",
          message:
            authMode === "oidc"
              ? "OIDC login enabled"
              : authMode === "both"
                ? "Password and OIDC login enabled"
                : "OIDC settings saved",
        });
      } else {
        setOidcStatus({ type: "error", message: data.error || "Failed to save OIDC settings" });
      }
    } catch (err) {
      setOidcStatus({ type: "error", message: "An error occurred" });
    } finally {
      setOidcLoading(false);
    }
  };

  const testOidcConnection = async () => {
    const issuerUrl = oidcForm.oidcIssuerUrl.trim();
    const clientId = oidcForm.oidcClientId.trim();
    const scopes = oidcForm.oidcScopes.trim();
    const secret = oidcClientSecret.trim();

    if (!issuerUrl || !clientId) {
      setOidcTestStatus({ type: "error", message: "Issuer URL and client ID are required to test the connection." });
      return;
    }

    setOidcTestLoading(true);
    setOidcStatus({ type: "", message: "" });
    setOidcTestStatus({ type: "", message: "" });

    try {
      const saveRes = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authMode: oidcForm.authMode || settings.authMode || "password",
          oidcIssuerUrl: issuerUrl,
          oidcClientId: clientId,
          oidcScopes: scopes || "openid profile email",
          oidcLoginLabel: oidcForm.oidcLoginLabel.trim() || "Sign in with OIDC",
          ...(secret ? { oidcClientSecret: secret } : {}),
        }),
      });

      const saved = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) {
        setOidcTestStatus({
          type: "error",
          message: saved.error || "Failed to save OIDC settings before testing",
        });
        return;
      }

      const res = await fetch("/api/auth/oidc/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issuerUrl: saved.oidcIssuerUrl || issuerUrl,
          clientId: saved.oidcClientId || clientId,
          scopes: saved.oidcScopes || scopes || "openid profile email",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        const statusMessage = data.clientSecretTested
          ? data.clientSecretValid === true
            ? `Connection OK. Discovery loaded from ${data.issuerUrl}. Client secret validated too.`
            : `Connection OK. Discovery loaded from ${data.issuerUrl}. Client secret was not checked.`
          : `Connection OK. Discovery loaded from ${data.issuerUrl}.`;
        setOidcTestStatus({
          type: "success",
          message: statusMessage,
        });
      } else {
        setOidcTestStatus({ type: "error", message: data.error || "OIDC connection test failed" });
      }
    } catch (err) {
      setOidcTestStatus({ type: "error", message: "An error occurred" });
    } finally {
      setOidcTestLoading(false);
    }
  };

  const updateSamlForm = (field, value) => {
    setSamlForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleIdpMetadataUpload = (event) => {
    const file = event.target.files?.[0];
    if (idpMetadataFileRef.current) idpMetadataFileRef.current.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const xmlText = e.target?.result || "";
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, "text/xml");
        const parserError = doc.querySelector("parsererror");
        if (parserError) {
          setSamlStatus({ type: "error", message: "Unable to parse valid SAML IdP metadata from XML file" });
          return;
        }

        const entityID = doc.documentElement.getAttribute("entityID") || "";
        const ssoNodes = Array.from(doc.querySelectorAll("SingleSignOnService, *|SingleSignOnService"));
        let ssoUrl = "";
        for (const node of ssoNodes) {
          const binding = node.getAttribute("Binding") || "";
          const location = node.getAttribute("Location") || "";
          if (location) {
            ssoUrl = location;
            if (binding.includes("HTTP-Redirect")) break;
          }
        }

        const certNodes = Array.from(doc.querySelectorAll("X509Certificate, *|X509Certificate"));
        let certStr = "";
        if (certNodes.length > 0) {
          certStr = certNodes[0].textContent.trim();
        }

        setSamlForm((prev) => ({
          ...prev,
          samlEntryPoint: ssoUrl || prev.samlEntryPoint,
          samlIssuer: prev.samlIssuer || "urn:9router:sp",
          samlCert: certStr || prev.samlCert,
        }));

        setSamlStatus({
          type: "success",
          message: `IdP Metadata imported! (SSO URL: ${ssoUrl ? "found" : "not found"}, EntityID: ${entityID ? "found" : "not found"}, Cert: ${certStr ? "found" : "not found"})`,
        });
      } catch (err) {
        setSamlStatus({ type: "error", message: "Error reading IdP Metadata XML file" });
      }
    };
    reader.readAsText(file);
  };

  const handleCertFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (certFileRef.current) certFileRef.current.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result || "";
      setSamlForm((prev) => ({ ...prev, samlCert: text.trim() }));
      setSamlStatus({ type: "success", message: "Certificate file loaded into configuration." });
    };
    reader.readAsText(file);
  };

  const saveSamlSettings = async (targetAuthMode = oidcForm.authMode || "password") => {
    setSamlLoading(true);
    setSamlStatus({ type: "", message: "" });
    setSamlTestStatus({ type: "", message: "" });

    try {
      const payload = {
        authMode: targetAuthMode,
        ssoType: "saml",
        samlEntryPoint: samlForm.samlEntryPoint.trim(),
        samlIssuer: samlForm.samlIssuer.trim() || "urn:9router:sp",
        samlCert: samlForm.samlCert.trim(),
        samlLoginLabel: samlForm.samlLoginLabel.trim() || "Sign in with SAML SSO",
        samlAttributeEmail: samlForm.samlAttributeEmail.trim() || "email",
        samlAttributeName: samlForm.samlAttributeName.trim() || "name",
      };

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setSettings((prev) => ({ ...prev, ...data }));
        setSamlForm({
          samlEntryPoint: data?.samlEntryPoint || payload.samlEntryPoint,
          samlIssuer: data?.samlIssuer || payload.samlIssuer,
          samlCert: data?.samlCert || payload.samlCert,
          samlLoginLabel: data?.samlLoginLabel || payload.samlLoginLabel,
          samlAttributeEmail: data?.samlAttributeEmail || payload.samlAttributeEmail,
          samlAttributeName: data?.samlAttributeName || payload.samlAttributeName,
        });
        setSamlStatus({
          type: "success",
          message:
            targetAuthMode === "sso" || targetAuthMode === "saml"
              ? "SAML SSO login enabled"
              : targetAuthMode === "both"
                ? "Password and SAML SSO login enabled"
                : "SAML 2.0 settings saved",
        });
      } else {
        setSamlStatus({ type: "error", message: data.error || "Failed to save SAML settings" });
      }
    } catch {
      setSamlStatus({ type: "error", message: "An error occurred while saving SAML settings" });
    } finally {
      setSamlLoading(false);
    }
  };

  const testSamlConnection = async () => {
    setSamlTestLoading(true);
    setSamlStatus({ type: "", message: "" });
    setSamlTestStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/auth/saml/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          samlEntryPoint: samlForm.samlEntryPoint.trim(),
          samlIssuer: samlForm.samlIssuer.trim(),
          samlCert: samlForm.samlCert.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setSamlTestStatus({ type: "success", message: data.message || "SAML configuration verified!" });
      } else {
        setSamlTestStatus({ type: "error", message: data.error || "SAML configuration test failed" });
      }
    } catch {
      setSamlTestStatus({ type: "error", message: "An error occurred while testing SAML configuration" });
    } finally {
      setSamlTestLoading(false);
    }
  };

  const updateObservabilityEnabled = async (enabled) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enableObservability: enabled }),
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, enableObservability: enabled }));
      }
    } catch (err) {
      console.error("Failed to update enableObservability:", err);
    }
  };

  const reloadSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) return;
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error("Failed to reload settings:", err);
    }
  };

  const handleExportDatabase = async (password) => {
    setDbLoading(true);
    setDbStatus({ type: "", message: "" });
    try {
      const res = await fetch("/api/settings/database", {
        headers: { "x-9r-password": password },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to export database");
      }

      const payload = await res.json();
      const content = JSON.stringify(payload, null, 2);
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[.:]/g, "-");
      anchor.href = url;
      anchor.download = `9router-backup-${stamp}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setDbStatus({ type: "success", message: "Database backup downloaded" });
    } catch (err) {
      setDbStatus({ type: "error", message: err.message || "Failed to export database" });
    } finally {
      setDbLoading(false);
    }
  };

  const handleImportDatabase = (event) => {
    const file = event.target.files?.[0];
    if (importFileRef.current) importFileRef.current.value = "";
    if (!file) return;
    pendingImportRef.current = file;
    setDbStatus({ type: "", message: "" });
    setDbAuth({ open: true, mode: "import", password: "" });
  };

  const runImportDatabase = async (password) => {
    const file = pendingImportRef.current;
    if (!file) return;
    setDbLoading(true);
    try {
      const raw = await file.text();
      const payload = JSON.parse(raw);

      const res = await fetch("/api/settings/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to import database");
      }

      await reloadSettings();
      setDbStatus({ type: "success", message: "Database imported successfully" });
    } catch (err) {
      setDbStatus({ type: "error", message: err.message || "Invalid backup file" });
    } finally {
      pendingImportRef.current = null;
      setDbLoading(false);
    }
  };

  // Confirm password modal, then run export or import.
  const handleDbAuthConfirm = async () => {
    const { mode, password } = dbAuth;
    setDbAuth({ open: false, mode: "", password: "" });
    if (mode === "export") await handleExportDatabase(password);
    else if (mode === "import") await runImportDatabase(password);
  };

  const observabilityEnabled = settings.enableObservability === true;

  const handleShutdown = async () => {
    setIsShuttingDown(true);
    try {
      await fetch("/api/version/shutdown", { method: "POST" });
    } catch (e) {
      // Expected to fail as server shuts down; ignore error
    }
    setIsShuttingDown(false);
    setShutdownOpen(false);
  };

  const handleLogout = async () => {    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.assign(`${window.location.origin}/login`);
      }
    } catch (err) {
      console.error("Failed to logout:", err);
    }
  };

  const orderedSidebarItems = resolveSidebarItems(settings.sidebarOrder);
  const isDefaultSidebarOrder = orderedSidebarItems.every((item, i) => item.key === SIDEBAR_ITEMS[i].key);

  const sidebarSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const saveSidebarOrder = async (list) => {
    const order = list.map((item) => item.key);
    setSettings((prev) => ({ ...prev, sidebarOrder: order }));
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sidebarOrder: order }),
      });
      if (res.ok) await useSettingsStore.getState().fetchSettings(true);
    } catch (err) {
      console.error("Failed to save sidebar order:", err);
    }
  };

  const moveSidebarItem = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= orderedSidebarItems.length) return;
    const next = [...orderedSidebarItems];
    [next[index], next[target]] = [next[target], next[index]];
    saveSidebarOrder(next);
  };

  const handleSidebarDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = orderedSidebarItems.findIndex((item) => item.key === active.id);
    const newIndex = orderedSidebarItems.findIndex((item) => item.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    saveSidebarOrder(arrayMove(orderedSidebarItems, oldIndex, newIndex));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-0">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSettingsTab(tab.key)}
              className={cnx(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                settingsTab === tab.key
                  ? "border-primary-500 bg-primary-500/10 text-primary-500"
                  : "border-card-border bg-background-soft-50 text-text-secondary hover:text-text-primary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Appearance */}
        <div className={cnx("flex flex-col gap-5", settingsTab !== "appearance" && "hidden")}>
        {/* Local Mode Info */}
        <Card id="local" className="scroll-mt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
                <Icon name="computer" className="size-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-text-primary">Local Mode</h3>
                <p className="text-sm text-text-secondary">Running on your machine</p>
              </div>
            </div>
            <div className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-card-border bg-background-gray-primary p-0.5">
              {THEME_CONFIG.accents.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAccent(option)}
                  title={option}
                  aria-label={`${option} accent`}
                  aria-pressed={accent === option}
                  className={cnx(
                    "pressable flex items-center justify-center rounded-md p-1.5 transition-colors",
                    accent === option
                      ? "bg-card-background shadow-sm"
                      : "hover:bg-background-soft-200"
                  )}
                >
                  <span
                    className={cnx(
                      "size-4 rounded-full ring-1 ring-black/20 transition-transform duration-200",
                      accent === option && "scale-110"
                    )}
                    style={{ background: ACCENT_SWATCHES[option] }}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-card-border pt-4">
            <div className="flex flex-col gap-2 rounded-lg border border-card-border bg-background-gray-primary p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">Database Location</p>
                <p className="break-all font-mono text-xs text-text-secondary">~/.9router/db/data.sqlite</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="secondary"
                icon="download"
                onClick={() => setDbAuth({ open: true, mode: "export", password: "" })}
                loading={dbLoading}
                className="w-full sm:w-auto"
              >
                Download Backup
              </Button>
              <Button
                variant="outline"
                icon="upload"
                onClick={() => importFileRef.current?.click()}
                disabled={dbLoading}
                className="w-full sm:w-auto"
              >
                Import Backup
              </Button>
              <input
                ref={importFileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportDatabase}
              />
            </div>
            {dbStatus.message && (
              <p className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${dbStatus.type === "error" ? "bg-error-500/10 text-error-500" : "bg-success-500/10 text-success-500"}`}>
                {dbStatus.message}
              </p>
            )}
          </div>
        </Card>

        {/* Sidebar order */}
        <Card id="sidebar-order" className="scroll-mt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
                <Icon name="reorder" className="size-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-text-primary">Sidebar order</h3>
                <p className="text-sm text-text-secondary">Navigation items, Settings stays pinned</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon="restart_alt"
              disabled={isDefaultSidebarOrder}
              onClick={() => saveSidebarOrder(SIDEBAR_ITEMS)}
            >
              Reset
            </Button>
          </div>
          <div className="mt-3 flex max-h-56 flex-col overflow-y-auto custom-scrollbar">
            <DndContext
              sensors={sidebarSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSidebarDragEnd}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            >
              <SortableContext items={orderedSidebarItems.map((item) => item.key)} strategy={verticalListSortingStrategy}>
                {orderedSidebarItems.map((item, idx) => (
                  <SidebarOrderRow
                    key={item.key}
                    item={item}
                    index={idx}
                    total={orderedSidebarItems.length}
                    onMove={moveSidebarItem}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </Card>
        </div>

        {/* Security */}
        <div className={cnx("flex flex-col gap-5", settingsTab !== "security" && "hidden")}>
        <Card id="security" className="scroll-mt-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
              <Icon name="shield" className="size-4.5" />
            </div>
            <h3 className="text-base font-semibold text-text-primary">Security</h3>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4 sm:items-center justify-between border-b border-card-border pb-4 last:border-b-0 last:pb-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">Require login</p>
                <p className="text-sm text-text-secondary">
                  When ON, dashboard requires password. When OFF, access without login.
                </p>
              </div>
              <Toggle
                checked={settings.requireLogin === true}
                onChange={() => updateRequireLogin(!settings.requireLogin)}
                disabled={loading}
              />
            </div>
            {settings.requireLogin === true && (
              <form onSubmit={handlePasswordChange} className="flex flex-col gap-4 pt-2">
                {settings.hasPassword && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">Current Password</label>
                    <input
                      type="password"
                      placeholder="Enter current password"
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      required
                      className="h-10 w-full rounded-lg border border-input-border bg-card-background px-3 text-sm text-text-primary outline-none placeholder:text-input-placeholder-text focus:border-primary-500"
                    />
                  </div>
                )}
                {/* {!settings.hasPassword && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Setting password for the first time. Leave current password empty or use default: <code className="bg-blue-500/20 px-1 rounded">123456</code>
                    </p>
                  </div>
                )} */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">New Password</label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      required
                      className="h-10 w-full rounded-lg border border-input-border bg-card-background px-3 text-sm text-text-primary outline-none placeholder:text-input-placeholder-text focus:border-primary-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      required
                      className="h-10 w-full rounded-lg border border-input-border bg-card-background px-3 text-sm text-text-primary outline-none placeholder:text-input-placeholder-text focus:border-primary-500"
                    />
                  </div>
                </div>

                {passStatus.message && (
                  <p className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${passStatus.type === "error" ? "bg-error-500/10 text-error-500" : "bg-success-500/10 text-success-500"}`}>
                    {passStatus.message}
                  </p>
                )}

                <div className="pt-2">
                  <Button type="submit" variant="primary" loading={passLoading} className="w-full sm:w-auto">
                    {settings.hasPassword ? "Update Password" : "Set Password"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>

        {/* Single Sign-On (SSO) */}
        <Card id="sso" className="scroll-mt-6">
          <button
            type="button"
            onClick={() => setOidcExpanded((v) => !v)}
            className="w-full flex items-center gap-3 text-left"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
              <Icon name="lock_open" className="size-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-text-primary">Single Sign-On (SSO)</h3>
              <p className="text-sm text-text-secondary">
                {settings.authMode === "sso" || settings.authMode === "oidc" || settings.authMode === "saml"
                  ? `${settings.ssoType === "saml" ? "SAML 2.0" : "OIDC"} SSO active`
                  : settings.authMode === "both"
                    ? `Password + ${settings.ssoType === "saml" ? "SAML 2.0" : "OIDC"} active`
                    : "Optional SSO via Okta, Entra ID, Keycloak, or OIDC"}
              </p>
            </div>
            <Icon name={oidcExpanded ? "expand_less" : "expand_more"} className="text-text-secondary shrink-0" />
          </button>
          {oidcExpanded && (
            <div className="flex flex-col gap-4 mt-4">
              <p className="text-sm text-text-secondary">
                Configure enterprise Single Sign-On (SSO) for dashboard access using SAML 2.0 or OIDC.
              </p>

              {/* SSO Protocol Switcher Tabs */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-primary">SSO Protocol</label>
                <div className="flex p-1 rounded-lg border border-card-border bg-background-gray-primary">
                  <button
                    type="button"
                    onClick={() => setSsoTypeTab("saml")}
                    className={cnx(
                      "flex-1 py-1.5 px-3 rounded-md font-medium text-sm transition-all text-center",
                      ssoTypeTab === "saml"
                        ? "bg-card-background text-text-primary shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    SAML 2.0
                  </button>
                  <button
                    type="button"
                    onClick={() => setSsoTypeTab("oidc")}
                    className={cnx(
                      "flex-1 py-1.5 px-3 rounded-md font-medium text-sm transition-all text-center",
                      ssoTypeTab === "oidc"
                        ? "bg-card-background text-text-primary shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    OIDC
                  </button>
                </div>
              </div>

              {/* Auth Mode selection */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-primary">Auth Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      value: "password",
                      title: "Password only",
                      desc: "Keep legacy password login.",
                    },
                    {
                      value: "sso",
                      title: `${ssoTypeTab === "saml" ? "SAML" : "OIDC"} only`,
                      desc: "Require SSO for dashboard access.",
                    },
                    {
                      value: "both",
                      title: "Both",
                      desc: "Allow password or SSO login.",
                    },
                  ].map((option) => {
                    const currentMode = oidcForm.authMode;
                    const active =
                      option.value === "password"
                        ? currentMode === "password"
                        : option.value === "sso"
                          ? currentMode === "sso" || currentMode === "saml" || currentMode === "oidc"
                          : currentMode === "both";
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateOidcForm("authMode", option.value)}
                        className={cnx(
                          "text-left rounded-lg border p-3 transition-colors",
                          active
                            ? "border-primary-500 bg-primary-500/10"
                            : "border-card-border bg-background-gray-primary hover:bg-background-soft-200"
                        )}
                        disabled={loading || oidcLoading || samlLoading}
                      >
                        <p className="text-sm font-medium text-text-primary">{option.title}</p>
                        <p className="text-sm text-text-secondary mt-1">{option.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {ssoTypeTab === "saml" ? (
                /* SAML Configuration Panel */
                <div className="flex flex-col gap-4 pt-2 border-t border-card-border">
                  {/* IdP Setup Guidelines Banner & Collapsible Drawer */}
                  <div className="overflow-hidden rounded-lg border border-card-border bg-background-gray-primary">
                    <button
                      type="button"
                      onClick={() => setShowSamlGuide((prev) => !prev)}
                      className="flex w-full items-center justify-between gap-2 p-3 text-left transition-colors hover:bg-background-soft-200"
                    >
                      <div className="flex items-center gap-2">
                        <Icon name="menu_book" className="text-primary-500 size-4.5" />
                        <div>
                          <p className="font-semibold text-xs sm:text-sm text-text-primary">
                            IdP Setup Guidelines & Provider Configuration Instructions
                          </p>
                          <p className="text-[11px] text-text-secondary">
                            Click to view setup steps for AWS IAM Identity Center, Okta, Entra ID, Keycloak, & Authentik
                          </p>
                        </div>
                      </div>
                      <Icon name="expand_more" className="text-text-secondary transition-transform size-4.5" style={{ transform: showSamlGuide ? "rotate(180deg)" : "none" }} />
                    </button>

                    {showSamlGuide && (
                      <div className="flex flex-col gap-3 border-t border-card-border bg-card-background p-4 text-xs text-text-primary">
                        <div className="rounded border border-primary-500/20 bg-primary-500/10 p-2.5 text-xs text-primary-500">
                          <p className="font-semibold mb-1 flex items-center gap-1.5"><Icon name="key" className="size-[15px]" />Required Service Provider (SP) Values for your IdP Setup:</p>
                          <ul className="list-disc pl-4 space-y-1 font-mono text-[11px]">
                            <li>
                              <b>Assertion Consumer Service (ACS) URL:</b>{" "}
                              <code className="rounded bg-background-100 px-1 py-0.5 break-all">{samlAcsUrl}</code>
                            </li>
                            <li>
                              <b>SP Entity ID / Audience URI:</b>{" "}
                              <code className="rounded bg-background-100 px-1 py-0.5 break-all">{samlForm.samlIssuer || "urn:9router:sp"}</code>
                            </li>
                            <li>
                              <b>NameID Format:</b>{" "}
                              <code className="rounded bg-background-100 px-1 py-0.5">EmailAddress</code> or <code className="rounded bg-background-100 px-1 py-0.5">Unspecified</code>
                            </li>
                          </ul>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div className="rounded border border-card-border bg-background-gray-primary p-3 flex flex-col gap-1.5">
                            <p className="font-semibold text-text-primary flex items-center gap-1.5">
                              <Icon name="cloud" className="text-primary-500" /> AWS IAM Identity Center
                            </p>
                            <ol className="list-decimal pl-4 text-text-secondary space-y-1">
                              <li>Applications → <b>Add application</b> → Select <b>Add custom SAML 2.0 application</b>.</li>
                              <li>Set <b>Application ACS URL</b> to <code className="text-text-primary font-mono">{samlAcsUrl}</code>.</li>
                              <li>Set <b>Application SAML audience</b> to <code className="text-text-primary font-mono">{samlForm.samlIssuer || "urn:9router:sp"}</code>.</li>
                              <li>Under <i>Attribute mappings</i>, map <code className="text-text-primary font-mono">Subject</code> or <code className="text-text-primary font-mono">email</code> to <code className="text-text-primary font-mono">${`{user:email}`}</code>.</li>
                              <li>Download <b>IAM Identity Center SAML metadata XML</b> file and use 1-Click Import below!</li>
                            </ol>
                          </div>

                          <div className="rounded border border-card-border bg-background-gray-primary p-3 flex flex-col gap-1.5">
                            <p className="font-semibold text-text-primary flex items-center gap-1.5">
                              <Icon name="grid_view" className="text-primary-500" /> Microsoft Entra ID (Azure AD)
                            </p>
                            <ol className="list-decimal pl-4 text-text-secondary space-y-1">
                              <li>Enterprise Applications → <b>New application</b> → <b>Create your own application</b>.</li>
                              <li>Select <b>Single sign-on</b> → <b>SAML</b>.</li>
                              <li><b>Identifier (Entity ID):</b> <code className="text-text-primary font-mono">{samlForm.samlIssuer || "urn:9router:sp"}</code></li>
                              <li><b>Reply URL (ACS):</b> <code className="text-text-primary font-mono">{samlAcsUrl}</code></li>
                              <li>Download <b>Federation Metadata XML</b> and import or copy X.509 Certificate.</li>
                            </ol>
                          </div>

                          <div className="rounded border border-card-border bg-background-gray-primary p-3 flex flex-col gap-1.5">
                            <p className="font-semibold text-text-primary flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-success-500" /> Okta / Auth0
                            </p>
                            <ol className="list-decimal pl-4 text-text-secondary space-y-1">
                              <li>Applications → <b>Create App Integration</b> → Select <b>SAML 2.0</b>.</li>
                              <li><b>Single Sign-On URL:</b> <code className="text-text-primary font-mono">{samlAcsUrl}</code></li>
                              <li><b>Audience URI (SP Entity ID):</b> <code className="text-text-primary font-mono">{samlForm.samlIssuer || "urn:9router:sp"}</code></li>
                              <li>Name ID format: <i>EmailAddress</i>.</li>
                              <li>Download Identity Provider metadata XML or copy the X.509 cert.</li>
                            </ol>
                          </div>

                          <div className="rounded border border-card-border bg-background-gray-primary p-3 flex flex-col gap-1.5">
                            <p className="font-semibold text-text-primary flex items-center gap-1.5">
                              <Icon name="shield" className="text-primary-500" /> Keycloak / Authentik
                            </p>
                            <ol className="list-decimal pl-4 text-text-secondary space-y-1">
                              <li>Clients → <b>Create client</b> → Select <b>SAML</b>.</li>
                              <li><b>Client ID:</b> <code className="text-text-primary font-mono">{samlForm.samlIssuer || "urn:9router:sp"}</code></li>
                              <li><b>Master SAML Processing URL:</b> <code className="text-text-primary font-mono">{samlAcsUrl}</code></li>
                              <li>Export SAML Descriptor XML or copy IDP Certificate PEM.</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Import Card */}
                  <div className="flex flex-col justify-between gap-3 rounded-lg border border-dashed border-primary-500/40 bg-primary-500/10 p-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-medium text-sm text-text-primary">1-Click IdP Metadata XML Import</p>
                      <p className="text-xs text-text-secondary">Auto-fill SSO URL, Issuer & Cert from XML metadata</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon="upload_file"
                      onClick={() => idpMetadataFileRef.current?.click()}
                    >
                      Upload Metadata XML
                    </Button>
                    <input
                      ref={idpMetadataFileRef}
                      type="file"
                      accept=".xml,application/xml,text/xml"
                      className="hidden"
                      onChange={handleIdpMetadataUpload}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-text-primary">Single Sign-On Service URL (samlEntryPoint)</label>
                      <Input
                        placeholder="https://idp.example.com/app/saml/sso/..."
                        value={samlForm.samlEntryPoint}
                        onChange={(e) => updateSamlForm("samlEntryPoint", e.target.value)}
                        disabled={loading || samlLoading}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-text-primary">SP Entity ID / Audience (samlIssuer)</label>
                      <Input
                        placeholder="urn:9router:sp"
                        value={samlForm.samlIssuer}
                        onChange={(e) => updateSamlForm("samlIssuer", e.target.value)}
                        disabled={loading || samlLoading}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-text-primary">IdP X.509 Certificate (samlCert)</label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          icon="file_upload"
                          onClick={() => certFileRef.current?.click()}
                        >
                          Upload Certificate
                        </Button>
                        <input
                          ref={certFileRef}
                          type="file"
                          accept=".crt,.pem,.cer,text/plain"
                          className="hidden"
                          onChange={handleCertFileUpload}
                        />
                      </div>
                      <textarea
                        rows={4}
                        placeholder="-----BEGIN CERTIFICATE-----&#10;MIIC...&#10;-----END CERTIFICATE-----"
                        value={samlForm.samlCert}
                        onChange={(e) => updateSamlForm("samlCert", e.target.value)}
                        className="w-full resize-y rounded-lg border border-input-border bg-card-background p-2.5 font-mono text-xs text-text-primary outline-none placeholder:text-input-placeholder-text focus:border-primary-500 disabled:opacity-50"
                        disabled={loading || samlLoading}
                      />
                      <p className="text-xs text-text-secondary">Paste raw Base64 certificate or PEM block.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-primary">Login Button Label</label>
                        <Input
                          placeholder="Sign in with SAML SSO"
                          value={samlForm.samlLoginLabel}
                          onChange={(e) => updateSamlForm("samlLoginLabel", e.target.value)}
                          disabled={loading || samlLoading}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-primary">Email Claim Attribute</label>
                        <Input
                          placeholder="email"
                          value={samlForm.samlAttributeEmail}
                          onChange={(e) => updateSamlForm("samlAttributeEmail", e.target.value)}
                          disabled={loading || samlLoading}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-primary">Display Name Claim</label>
                        <Input
                          placeholder="name"
                          value={samlForm.samlAttributeName}
                          onChange={(e) => updateSamlForm("samlAttributeName", e.target.value)}
                          disabled={loading || samlLoading}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 rounded-lg border border-card-border bg-background-gray-primary p-3 text-xs text-text-secondary sm:text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-text-primary">ACS Callback URL</p>
                        <code className="block break-all font-mono text-xs">{samlAcsUrl}</code>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        icon="content_copy"
                        onClick={() => {
                          navigator.clipboard.writeText(samlAcsUrl);
                          setSamlStatus({ type: "success", message: "ACS URL copied to clipboard!" });
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-card-border">
                      <div>
                        <p className="font-medium text-text-primary">SP XML Metadata</p>
                        <code className="block break-all font-mono text-xs">{samlMetadataUrl}</code>
                      </div>
                      <a
                        href={samlMetadataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download="9router-sp-metadata.xml"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary-500 hover:underline"
                      >
                        <Icon name="download" className="size-4" />
                        Download XML
                      </a>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-card-border">
                    <Button
                      type="button"
                      variant="primary"
                      loading={samlLoading}
                      onClick={() => saveSamlSettings(oidcForm.authMode)}
                      className="w-full sm:w-auto"
                    >
                      Save SAML settings
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      loading={samlTestLoading}
                      onClick={testSamlConnection}
                      className="w-full sm:w-auto"
                    >
                      Test SAML settings
                    </Button>
                  </div>

                  {samlTestStatus.message && (
                    <p className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${samlTestStatus.type === "error" ? "bg-error-500/10 text-error-500" : "bg-success-500/10 text-success-500"}`}>
                      {samlTestStatus.message}
                    </p>
                  )}

                  {samlStatus.message && (
                    <p className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${samlStatus.type === "error" ? "bg-error-500/10 text-error-500" : "bg-success-500/10 text-success-500"}`}>
                      {samlStatus.message}
                    </p>
                  )}
                </div>
              ) : (
                /* OIDC Panel */
                <div className="flex flex-col gap-4 pt-2 border-t border-card-border">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-text-primary">Issuer URL</label>
                      <Input
                        placeholder="https://auth.example.com/application/o/9router/"
                        value={oidcForm.oidcIssuerUrl}
                        onChange={(e) => updateOidcForm("oidcIssuerUrl", e.target.value)}
                        disabled={loading || oidcLoading}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-text-primary">Client ID</label>
                      <Input
                        placeholder="9router-dashboard"
                        value={oidcForm.oidcClientId}
                        onChange={(e) => updateOidcForm("oidcClientId", e.target.value)}
                        disabled={loading || oidcLoading}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-text-primary">Client Secret</label>
                      <Input
                        type="password"
                        placeholder="Leave blank to keep existing secret"
                        value={oidcClientSecret}
                        onChange={(e) => setOidcClientSecret(e.target.value)}
                        disabled={loading || oidcLoading}
                      />
                      <p className="text-xs sm:text-sm text-text-secondary">This value is write-only after saving.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-text-primary">Scopes</label>
                      <Input
                        placeholder="openid profile email"
                        value={oidcForm.oidcScopes}
                        onChange={(e) => updateOidcForm("oidcScopes", e.target.value)}
                        disabled={loading || oidcLoading}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-text-primary">Login Button Label</label>
                      <Input
                        placeholder="Sign in with OIDC"
                        value={oidcForm.oidcLoginLabel}
                        onChange={(e) => updateOidcForm("oidcLoginLabel", e.target.value)}
                        disabled={loading || oidcLoading}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-card-border bg-background-gray-primary p-3 text-xs text-text-secondary sm:text-sm">
                    <p className="font-medium text-text-primary mb-1">Redirect URI</p>
                    <code className="block break-all font-mono">{oidcRedirectUri}</code>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-card-border">
                    <Button type="button" variant="primary" loading={oidcLoading} onClick={() => saveOidcSettings()} className="w-full sm:w-auto">
                      Save OIDC settings
                    </Button>
                    <Button type="button" variant="outline" loading={oidcTestLoading} onClick={testOidcConnection} className="w-full sm:w-auto">
                      Test connection
                    </Button>
                  </div>

                  {oidcTestStatus.message && (
                    <p className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${oidcTestStatus.type === "error" ? "bg-error-500/10 text-error-500" : "bg-success-500/10 text-success-500"}`}>
                      {oidcTestStatus.message}
                    </p>
                  )}

                  {oidcStatus.message && (
                    <p className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${oidcStatus.type === "error" ? "bg-error-500/10 text-error-500" : "bg-success-500/10 text-success-500"}`}>
                      {oidcStatus.message}
                    </p>
                  )}
                </div>
              )}

              {settings.authMode === "oidc" || settings.authMode === "saml" || settings.authMode === "sso" ? (
                <p className="text-xs text-warning-500 sm:text-sm">
                  SSO login ({settings.ssoType === "saml" ? "SAML 2.0" : "OIDC"}) is currently active. Password login is disabled until you switch back.
                </p>
              ) : null}

              {settings.authMode === "both" && (
                <p className="text-xs text-warning-500 sm:text-sm">
                  Password and SSO login ({settings.ssoType === "saml" ? "SAML 2.0" : "OIDC"}) are both active.
                </p>
              )}
            </div>
          )}
        </Card>
        </div>

        {/* Routing Preferences */}
        <div className={cnx("flex flex-col gap-5", settingsTab !== "network" && "hidden")}>
        <Card id="routing" className="scroll-mt-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
              <Icon name="route" className="size-4.5" />
            </div>
            <h3 className="text-base font-semibold text-text-primary">Routing Strategy</h3>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">Round Robin</p>
                <p className="text-xs sm:text-sm text-text-secondary">
                  Cycle through accounts to distribute load
                </p>
              </div>
              <Toggle
                checked={settings.fallbackStrategy === "round-robin"}
                onChange={() => updateFallbackStrategy(settings.fallbackStrategy === "round-robin" ? "fill-first" : "round-robin")}
                disabled={loading}
              />
            </div>

            {/* Sticky Round Robin Limit */}
            {settings.fallbackStrategy === "round-robin" && (
              <div className="flex items-start sm:items-center justify-between gap-4 pt-2 border-t border-card-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">Sticky Limit</p>
                  <p className="text-xs sm:text-sm text-text-secondary">
                    Calls per account before switching
                  </p>
                </div>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.stickyRoundRobinLimit || 3}
                  onChange={(e) => updateStickyLimit(e.target.value)}
                  disabled={loading}
                  className="w-16 sm:w-20 text-center shrink-0"
                />
              </div>
            )}

            {/* Combo Round Robin */}
            <div className="flex items-start sm:items-center justify-between gap-4 pt-4 border-t border-card-border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">Combo Round Robin</p>
                <p className="text-xs sm:text-sm text-text-secondary">
                  Cycle through providers in combos instead of always starting with first
                </p>
              </div>
              <Toggle
                checked={settings.comboStrategy === "round-robin"}
                onChange={() => updateComboStrategy(settings.comboStrategy === "round-robin" ? "fallback" : "round-robin")}
                disabled={loading}
              />
            </div>

            {/* Combo Sticky Round Robin Limit */}
            {settings.comboStrategy === "round-robin" && (
              <div className="flex items-center justify-between pt-2 border-t border-card-border">
                <div>
                  <p className="text-sm font-medium text-text-primary">Combo Sticky Limit</p>
                  <p className="text-sm text-text-secondary">
                    Calls per combo model before switching
                  </p>
                </div>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.comboStickyRoundRobinLimit || 1}
                  onChange={(e) => updateComboStickyLimit(e.target.value)}
                  disabled={loading}
                  className="w-20 text-center"
                />
              </div>
            )}

            <p className="text-xs text-text-secondary italic pt-2 border-t border-card-border">
              {settings.fallbackStrategy === "round-robin"
                ? `Currently distributing requests across all available accounts with ${settings.stickyRoundRobinLimit || 3} calls per account.`
                : "Currently using accounts in priority order (Fill First)."}
              {settings.comboStrategy === "round-robin"
                ? ` Combos rotate after ${settings.comboStickyRoundRobinLimit || 1} call${(settings.comboStickyRoundRobinLimit || 1) === 1 ? "" : "s"} per model.`
                : " Combos always start with their first model."}
            </p>
          </div>
        </Card>

        {/* Network */}
        <Card id="network" className="scroll-mt-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
              <Icon name="wifi" className="size-4.5" />
            </div>
            <h3 className="text-base font-semibold text-text-primary">Network</h3>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">Outbound Proxy</p>
                <p className="text-xs sm:text-sm text-text-secondary">Enable proxy for OAuth + provider outbound requests.</p>
              </div>
              <Toggle
                checked={settings.outboundProxyEnabled === true}
                onChange={() => updateOutboundProxyEnabled(!(settings.outboundProxyEnabled === true))}
                disabled={loading || proxyLoading}
              />
            </div>

            {settings.outboundProxyEnabled === true && (
              <form onSubmit={updateOutboundProxy} className="flex flex-col gap-4 pt-2 border-t border-card-border">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-primary">Proxy URL</label>
                  <Input
                    placeholder="http://127.0.0.1:7897"
                    value={proxyForm.outboundProxyUrl}
                    onChange={(e) => setProxyForm((prev) => ({ ...prev, outboundProxyUrl: e.target.value }))}
                    disabled={loading || proxyLoading}
                  />
                  <p className="text-xs sm:text-sm text-text-secondary">Leave empty to inherit existing env proxy (if any).</p>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-card-border">
                  <label className="text-sm font-medium text-text-primary">No Proxy</label>
                  <Input
                    placeholder="localhost,127.0.0.1"
                    value={proxyForm.outboundNoProxy}
                    onChange={(e) => setProxyForm((prev) => ({ ...prev, outboundNoProxy: e.target.value }))}
                    disabled={loading || proxyLoading}
                  />
                  <p className="text-xs sm:text-sm text-text-secondary">Comma-separated hostnames/domains to bypass the proxy.</p>
                </div>

                <div className="pt-2 border-t border-card-border flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    loading={proxyTestLoading}
                    disabled={loading || proxyLoading}
                    onClick={testOutboundProxy}
                    className="w-full sm:w-auto"
                  >
                    Test proxy URL
                  </Button>
                  <Button type="submit" variant="primary" loading={proxyLoading} className="w-full sm:w-auto">
                    Apply
                  </Button>
                </div>
              </form>
            )}

            {proxyStatus.message && (
              <p className={`text-xs sm:text-sm ${proxyStatus.type === "error" ? "text-error-500" : "text-success-500"} pt-2 border-t border-card-border`}>
                {proxyStatus.message}
              </p>
            )}
          </div>
        </Card>
        </div>

        {/* Notifications / Webhook */}
        <div className={cnx("flex flex-col gap-5", settingsTab !== "advanced" && "hidden")}>
        <Card id="notifications" className="scroll-mt-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
              <Icon name="notifications_active" className="size-4.5" />
            </div>
            <h3 className="text-base font-semibold text-text-primary">Notifications</h3>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">Discord Webhook</p>
                <p className="text-xs sm:text-sm text-text-secondary">
                  Send an alert when a provider or combo fails. Throttled to one message per minute per title.
                </p>
              </div>
              <Toggle
                checked={webhookForm.enabled === true}
                onChange={() => updateWebhookEnabled(!(webhookForm.enabled === true))}
                disabled={loading || webhookLoading}
              />
            </div>

            {webhookForm.enabled === true && (
              <form onSubmit={saveWebhook} className="flex flex-col gap-4 pt-2 border-t border-card-border">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-primary">Webhook URL</label>
                  <Input
                    type="url"
                    placeholder="https://discord.com/api/webhooks/123456789/abcdef..."
                    value={webhookForm.url}
                    onChange={(e) => setWebhookForm((prev) => ({ ...prev, url: e.target.value }))}
                    disabled={loading || webhookLoading}
                  />
                  <p className="text-xs sm:text-sm text-text-secondary">
                    Paste the full Discord webhook URL to send alerts to your own channel. Leave empty to use the
                    built-in default (or the <code>DISCORD_WEBHOOK_URL</code> env var).
                  </p>
                </div>

                <div className="pt-2 border-t border-card-border flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    loading={webhookTestLoading}
                    disabled={loading || webhookLoading}
                    onClick={testWebhook}
                    className="w-full sm:w-auto"
                  >
                    Send test message
                  </Button>
                  <Button type="submit" variant="primary" loading={webhookLoading} className="w-full sm:w-auto">
                    Save
                  </Button>
                </div>
              </form>
            )}

            {webhookStatus.message && (
              <p className={`text-xs sm:text-sm ${webhookStatus.type === "error" ? "text-error-500" : "text-success-500"} pt-2 border-t border-card-border`}>
                {webhookStatus.message}
              </p>
            )}
          </div>
        </Card>

        {/* Observability Settings */}
        <Card id="observability" className="scroll-mt-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
              <Icon name="monitoring" className="size-4.5" />
            </div>
            <h3 className="text-base font-semibold text-text-primary">Observability</h3>
          </div>
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">Enable Observability</p>
              <p className="text-xs sm:text-sm text-text-secondary">
                Record request details for inspection in the logs view
              </p>
            </div>
            <Toggle
              checked={observabilityEnabled}
              onChange={updateObservabilityEnabled}
              disabled={loading}
            />
          </div>
        </Card>
        </div>
      </div>

      {/* Account actions */}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            fullWidth
            icon="power_settings_new"
            onClick={() => setShutdownOpen(true)}
            className="border-error-500/30 text-error-500 hover:border-error-500/50 hover:bg-error-500/10"
          >
            Shutdown
          </Button>
          <Button
            variant="outline"
            fullWidth
            icon="logout"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>

      {/* App Info */}
      <div className="py-4 text-center text-xs text-text-secondary sm:text-sm">
        <p>{APP_CONFIG.name} v{APP_CONFIG.version}</p>
        <p className="mt-1">{isRemoteHost ? "Remote Mode" : "Local Mode - All data stored on your machine"}</p>
      </div>

      <ConfirmModal
        isOpen={shutdownOpen}
        onClose={() => setShutdownOpen(false)}
        onConfirm={handleShutdown}
        title="Close Proxy"
        message="Are you sure you want to close the proxy server?"
        confirmText="Close"
        cancelText="Cancel"
        variant="danger"
        loading={isShuttingDown}
      />

      <Modal
        isOpen={dbAuth.open}
        onClose={() => setDbAuth({ open: false, mode: "", password: "" })}
        title="Confirm Password"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDbAuth({ open: false, mode: "", password: "" })} disabled={dbLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleDbAuthConfirm} loading={dbLoading} disabled={!dbAuth.password}>
              Confirm
            </Button>
          </>
        }
      >
        <p className="text-text-secondary mb-3 text-sm">
          Enter your current password to {dbAuth.mode === "export" ? "export" : "import"} the database.
        </p>
        <Input
          type="password"
          value={dbAuth.password}
          onChange={(e) => setDbAuth((s) => ({ ...s, password: e.target.value }))}
          onKeyDown={(e) => { if (e.key === "Enter" && dbAuth.password) handleDbAuthConfirm(); }}
          placeholder="Current password"
          autoFocus
        />
      </Modal>
    </div>
  );
}

function SidebarOrderRow({ item, index, total, onMove }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id: item.key });
  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 border-b border-card-border px-4 py-3 transition-colors hover:bg-background-gray-primary last:border-b-0 ${isDragging ? "shadow-md ring-1 ring-primary-500/30" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="shrink-0 cursor-grab touch-none rounded p-0.5 text-text-secondary hover:text-primary-500 active:cursor-grabbing"
        title="Drag to reorder"
        aria-label={`Reorder ${item.label}`}
      >
        <Icon name="drag_indicator" className="size-4.5" />
      </button>
      <Icon name={item.icon} className="size-4.5 text-text-secondary" />
      <span className="flex-1 truncate text-sm text-text-primary">{item.label}</span>
      <button
        type="button"
        onClick={() => onMove(index, -1)}
        disabled={index === 0}
        className="rounded p-1 text-text-secondary transition-colors hover:bg-background-gray-primary hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label={`Move ${item.label} up`}
        title="Move up"
      >
        <Icon name="arrow_upward" className="size-4.5" />
      </button>
      <button
        type="button"
        onClick={() => onMove(index, 1)}
        disabled={index === total - 1}
        className="rounded p-1 text-text-secondary transition-colors hover:bg-background-gray-primary hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label={`Move ${item.label} down`}
        title="Move down"
      >
        <Icon name="arrow_downward" className="size-4.5" />
      </button>
    </div>
  );
}
