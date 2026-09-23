import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { FaDownload, FaXmark } from "react-icons/fa6";
import {
  attemptUpdateInstall,
  checkForUpdates,
  type AvailableUpdate,
} from "../updater";
import "./updateCard.css";

const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;
const DEFERRED_UPDATE_IDLE_MS = 10 * 60 * 1000;
const DEFERRED_UPDATE_POLL_MS = 30 * 1000;

export default function UpdateCard() {
  const location = useLocation();
  const updateButtonRef = useRef<HTMLButtonElement>(null);
  const [availableUpdate, setAvailableUpdate] = useState<AvailableUpdate | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snoozedVersion, setSnoozedVersion] = useState<string | null>(null);

  const isPlayScreen = location.pathname.startsWith("/play/");
  const isPlayScreenRef = useRef(isPlayScreen);
  const isInstallingRef = useRef(false);
  const lastActivityAtRef = useRef(Date.now());

  useEffect(() => {
    isPlayScreenRef.current = isPlayScreen;
  }, [isPlayScreen]);

  useEffect(() => {
    isInstallingRef.current = isInstalling;
  }, [isInstalling]);

  useEffect(() => {
    let isMounted = true;

    async function runCheck() {
      const update = await checkForUpdates();

      if (!isMounted) return;

      setError(null);
      setAvailableUpdate(update);

      if (update) {
        setSnoozedVersion(null);
        setIsVisible(!isPlayScreenRef.current);
      } else {
        setIsVisible(false);
      }
    }

    runCheck();
    const interval = window.setInterval(runCheck, UPDATE_CHECK_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!availableUpdate) return;

    if (isPlayScreen) {
      setIsVisible(false);
      return;
    }

    if (availableUpdate.version !== snoozedVersion) {
      setIsVisible(true);
    }
  }, [availableUpdate, isPlayScreen, snoozedVersion]);

  useEffect(() => {
    if (isVisible) {
      updateButtonRef.current?.focus();
    }
  }, [isVisible]);

  const installUpdate = useCallback(async () => {
    if (isInstallingRef.current) return;

    isInstallingRef.current = true;
    setIsInstalling(true);
    setError(null);

    const didInstall = await attemptUpdateInstall();

    if (!didInstall) {
      setError("The update could not be installed. Please try again.");
      isInstallingRef.current = false;
      setIsInstalling(false);
    }
  }, []);

  useEffect(() => {
    const recordActivity = () => {
      lastActivityAtRef.current = Date.now();
    };

    const activityEvents = [
      "keydown",
      "mousedown",
      "mousemove",
      "pointerdown",
      "scroll",
      "touchstart",
      "wheel",
    ] as const;

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
    };
  }, []);

  useEffect(() => {
    if (!availableUpdate || snoozedVersion !== availableUpdate.version) return;

    const installWhenIdle = () => {
      if (isInstallingRef.current || isPlayScreenRef.current) return;

      const idleForMs = Date.now() - lastActivityAtRef.current;

      if (idleForMs >= DEFERRED_UPDATE_IDLE_MS) {
        installUpdate();
      }
    };

    const interval = window.setInterval(installWhenIdle, DEFERRED_UPDATE_POLL_MS);
    installWhenIdle();

    return () => {
      window.clearInterval(interval);
    };
  }, [availableUpdate, installUpdate, snoozedVersion]);

  function dismissUpdate() {
    if (!availableUpdate) return;

    setSnoozedVersion(availableUpdate.version);
    setIsVisible(false);
  }

  if (!availableUpdate || !isVisible || isPlayScreen) {
    return null;
  }

  return (
    <div className="update-card" role="presentation">
      <section
        aria-labelledby="update-card-title"
        aria-modal="true"
        className="update-card__dialog"
        role="dialog"
      >
        <button
          aria-label="Dismiss update"
          className="update-card__close"
          disabled={isInstalling}
          onClick={dismissUpdate}
          type="button"
        >
          <FaXmark />
        </button>

        <p className="eyebrow">Update Available</p>
        <h2 className="update-card__title" id="update-card-title">
          Would you like to update now?
        </h2>
        <p className="update-card__body">
          Choosing Later will install this update after 10 minutes of inactivity.
        </p>

        <div className="update-card__versions" aria-label="Version details">
          <div>
            <span>Current</span>
            <strong>{availableUpdate.currentVersion}</strong>
          </div>
          <div>
            <span>Target</span>
            <strong>{availableUpdate.version}</strong>
          </div>
        </div>

        {error && <p className="update-card__error">{error}</p>}

        <div className="update-card__actions">
          <button
            className="update-card__button update-card__button--secondary"
            disabled={isInstalling}
            onClick={dismissUpdate}
            type="button"
          >
            Later
          </button>
          <button
            className="update-card__button update-card__button--primary"
            disabled={isInstalling}
            onClick={installUpdate}
            ref={updateButtonRef}
            type="button"
          >
            <FaDownload />
            {isInstalling ? "Updating..." : "Update"}
          </button>
        </div>
      </section>
    </div>
  );
}
