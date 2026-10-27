/**
 * Client half of dsh-pajama-whale.
 *
 * A small person in a blue-whale onesie lives in the frame-wide overlay layer.
 * The artwork is a sprite pack: four squash directions (8 frames each) and a
 * few emotion animations. Everything is inlined as WebP data URIs by
 * tools/build-client.mjs, so the browser module needs no file access.
 *
 * Behaviour:
 *   - drag him anywhere with mouse or touch;
 *   - no gravity, no bounce: throw him and he flies straight until he hits the
 *     window edge, then sticks there in the matching squash frame;
 *   - pressing uses the pack's own frames: the pointer overshoot past the wall
 *     selects frame 0..7 while the wall-side edge stays put;
 *   - idle: he blinks, wags his tail or laughs now and then;
 *   - a thought cloud reports agent status, pending interactions, errors and
 *     context pressure, and sometimes shows idle thoughts, sleep or a break
 *     reminder.
 */
window.__ModuleLoader__.load({
  id: 'dsh-pajama-whale',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /* ------------------------------------------------------------------ */
    /* Sprite sheets (inlined by tools/build-client.mjs)                   */
    /* ------------------------------------------------------------------ */

    const SHEET_SQ_UP = '__SHEET_SQ_UP__';
    const SHEET_SQ_RIGHT = '__SHEET_SQ_RIGHT__';
    const SHEET_SQ_LEFT = '__SHEET_SQ_LEFT__';
    const SHEET_SQ_DOWN = '__SHEET_SQ_DOWN__';
    const SHEET_EMO_BLINK = '__SHEET_EMO_BLINK__';
    const SHEET_EMO_TAIL_WAG = '__SHEET_EMO_TAIL_WAG__';
    const SHEET_EMO_JOY = '__SHEET_EMO_JOY__';

    const SQUASH = {
      up: { key: 'up', sheet: SHEET_SQ_UP },
      right: { key: 'right', sheet: SHEET_SQ_RIGHT },
      left: { key: 'left', sheet: SHEET_SQ_LEFT },
      down: { key: 'down', sheet: SHEET_SQ_DOWN },
    };
    const SQUASH_FRAMES = 8;
    const NEUTRAL = SQUASH.down;

    const EMOTIONS = {
      blink: { key: 'blink', sheet: SHEET_EMO_BLINK, frames: 4, fps: 16 },
      tail: { key: 'tail', sheet: SHEET_EMO_TAIL_WAG, frames: 12, fps: 14 },
      joy: { key: 'joy', sheet: SHEET_EMO_JOY, frames: 12, fps: 14 },
    };

    // Source frame geometry: the character bbox inside each 896x1123 frame
    // never moves for the neutral pose, so the wall contact edge is exact.
    const FRAME_W = 896;
    const FRAME_H = 1123;
    const BBOX_L = 69;
    const BBOX_T = 68;
    const BBOX_R = 716;
    const BBOX_B = 1049;

    const FRAME_CSS_W = 155;
    const FRAME_CSS_H = Math.round((FRAME_H * FRAME_CSS_W) / FRAME_W);
    const SCALE = FRAME_CSS_W / FRAME_W;
    const CHAR_W = Math.round((BBOX_R - BBOX_L) * SCALE);
    const CHAR_H = Math.round((BBOX_B - BBOX_T) * SCALE);
    const OFF_X = BBOX_L * SCALE;
    const OFF_Y = BBOX_T * SCALE;

    const STORAGE_KEY = 'dsh-pajama-whale:position:v1';
    const PULL_PX = 110;
    const THROW_THRESHOLD = 120;
    const PAUSE_MS = 120;
    const DEPTH_EASE = 143; // ~7 ms
    const IDLE_MS = 8 * 60_000;
    const NIGHT_IDLE_MS = 2 * 60_000;
    const BREAK_AFTER_MS = 50 * 60_000;
    const BREAK_REPEAT_MS = 45 * 60_000;

    const LOCALE_NS = 'pajama-whale';

    const LOCALE_DICT = {
      en: {
        'status.thinking': 'thinking',
        'status.working': 'working',
        'status.error': '! error',
        'status.waiting': '?',
        'context.percent': 'context {percent}%',
        'break.suggest': 'take a break?',
        'sleep.zzz': 'z z z',
        'aria.cloud': 'Pet: {status}',
        'thought.hmm': 'hmm…',
        'thought.clouds': 'clouds…',
        'thought.heart': '♡',
        'thought.more': 'just a little more',
        'thought.drink': 'could use a drink…',
        'thought.dots': '...',
        'thought.interesting': 'interesting',
      },
      zh: {
        'status.thinking': '思考中',
        'status.working': '工作中',
        'status.error': '! 出错了',
        'status.waiting': '?',
        'context.percent': '上下文 {percent}%',
        'break.suggest': '休息一下？',
        'sleep.zzz': 'z z z',
        'aria.cloud': '宠物：{status}',
        'thought.hmm': '嗯…',
        'thought.clouds': '云朵…',
        'thought.heart': '♡',
        'thought.more': '再一点点',
        'thought.drink': '好想喝点东西…',
        'thought.dots': '...',
        'thought.interesting': '有意思',
      },
    };

    const THOUGHTS = [
      'thought.hmm',
      'thought.clouds',
      'thought.heart',
      'thought.more',
      'thought.drink',
      'thought.dots',
      'thought.interesting',
    ];

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const pickSessionId = (sessions) => {
      if (!sessions) return undefined;
      const ids = sessions.ids ?? [];
      const byId = sessions.byId ?? {};
      for (const id of ids) {
        if ((byId[id]?.retainedBy?.mainView ?? 0) > 0) return id;
      }
      for (const id of ids) {
        if (byId[id]?.running) return id;
      }
      return ids[0];
    };

    const scanToolActivity = (events) => {
      const entries = events?.entries;
      if (!entries || entries.length === 0) return false;
      const start = Math.max(0, entries.length - 400);
      for (let i = entries.length - 1; i >= start; i -= 1) {
        const type = entries[i]?.event?.type;
        if (!type) continue;
        if (type === 'user/message') return false;
        if (type === 'tool/call' || type === 'tool/result') return true;
      }
      return false;
    };

    const readStoredPosition = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed.xRatio !== 'number' || typeof parsed.yRatio !== 'number') return null;
        return parsed;
      } catch {
        return null;
      }
    };

    const storePosition = (x, y) => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            xRatio: window.innerWidth > 0 ? clamp(x, 0, window.innerWidth) / window.innerWidth : 0,
            yRatio: window.innerHeight > 0 ? clamp(y, 0, window.innerHeight) / window.innerHeight : 0,
          }),
        );
      } catch {
        /* storage may be unavailable; the pet still works without persistence */
      }
    };

    const initialPosition = () => {
      const stored = readStoredPosition();
      if (!stored) {
        return {
          x: Math.max(16, window.innerWidth - CHAR_W - 28),
          y: Math.max(16, window.innerHeight - CHAR_H - 96),
        };
      }
      return {
        x: clamp(stored.xRatio * window.innerWidth, 0, Math.max(0, window.innerWidth - CHAR_W)),
        y: clamp(stored.yRatio * window.innerHeight, 0, Math.max(0, window.innerHeight - CHAR_H)),
      };
    };

    function Pet(props) {
      const { host, localeFace, useSessions, useSessionStatus } = props;

      // The locale service is read directly instead of through the slot's
      // `locale` option: that keeps the pet alive even if dictionary
      // registration lags behind slot registration.
      const [, bumpLocale] = React.useReducer((count) => count + 1, 0);
      React.useEffect(() => {
        if (!localeFace || typeof localeFace.subscribe !== 'function') return undefined;
        return localeFace.subscribe(() => bumpLocale());
      }, [localeFace]);

      const tr =
        localeFace && typeof localeFace.bind === 'function'
          ? localeFace.bind(LOCALE_NS)
          : (key, params) => {
              const template = LOCALE_DICT.en[key] ?? key;
              return params
                ? template.replace(/\{(\w+)\}/g, (match, name) =>
                    name in params ? String(params[name]) : match,
                  )
                : template;
            };

      const rootRef = React.useRef(null);
      const hitRef = React.useRef(null);
      const layerARef = React.useRef(null);
      const frameRef = React.useRef(0);

      /* ---- session data ------------------------------------------------ */

      const useSessionsHook = typeof useSessions === 'function' ? useSessions : () => undefined;
      const sessions = useSessionsHook((snapshot) => snapshot);
      const sessionId = React.useMemo(() => pickSessionId(sessions), [sessions]);

      const useSessionStatusHook =
        typeof useSessionStatus === 'function' ? useSessionStatus : () => undefined;
      const status = useSessionStatusHook((snapshot) =>
        sessionId ? snapshot.get(sessionId) : undefined,
      );

      const [sessionInfo, setSessionInfo] = React.useState({
        contextPercent: null,
        error: null,
        toolActive: false,
      });
      const [cloud, setCloud] = React.useState(null);
      const [hovered, setHovered] = React.useState(false);
      const [below, setBelow] = React.useState(false);
      const [cloudShift, setCloudShift] = React.useState(0);
      const cloudRef = React.useRef(null);
      const [visible, setVisible] = React.useState(() =>
        typeof document === 'undefined' ? true : !document.hidden,
      );
      const [breathing, setBreathing] = React.useState(false);

      const liveRef = React.useRef({});
      liveRef.current = { status, sessionInfo, hovered, state: null };

      const stateRef = React.useRef(null);
      if (stateRef.current === null) {
        const start = initialPosition();
        stateRef.current = {
          x: start.x,
          y: start.y,
          vx: 0,
          vy: 0,
          side: null,
          depth: 0,
          depthSmooth: 0,
          stuck: false,
          dragging: false,
          pointerId: null,
          grabX: 0,
          grabY: 0,
          lastX: 0,
          lastY: 0,
          lastTime: 0,
          lastMoveAt: 0,
          anim: null,
        };
      }
      const state = stateRef.current;
      liveRef.current.state = state;

      const bounds = () => ({
        maxX: Math.max(0, window.innerWidth - CHAR_W),
        maxY: Math.max(0, window.innerHeight - CHAR_H),
      });

      /* ---- sprite painting -------------------------------------------- */

      const setLayer = (layer, key, sheet, frames, frame, opacity) => {
        if (!layer) return;
        if (layer.dataset.sheet !== key) {
          layer.style.backgroundImage = `url("${sheet}")`;
          layer.style.backgroundSize = `${frames * FRAME_CSS_W}px ${FRAME_CSS_H}px`;
          layer.dataset.sheet = key;
        }
        layer.style.backgroundPosition = `${-frame * FRAME_CSS_W}px 0`;
        layer.style.opacity = opacity > 0.001 ? String(opacity) : '0';
      };

      const resolveSprite = (now) => {
        if (state.anim) {
          const { config, start } = state.anim;
          const position = ((now - start) / 1000) * config.fps;
          if (position < config.frames) {
            return { key: config.key, sheet: config.sheet, frames: config.frames, position };
          }
          state.anim = null;
        }
        if (state.side) {
          const squash = SQUASH[state.side];
          return {
            key: squash.key,
            sheet: squash.sheet,
            frames: SQUASH_FRAMES,
            position: state.depthSmooth * (SQUASH_FRAMES - 1),
          };
        }
        return { key: NEUTRAL.key, sheet: NEUTRAL.sheet, frames: SQUASH_FRAMES, position: 0 };
      };

      const paint = (now) => {
        const root = rootRef.current;
        if (!root) return;

        const { key, sheet, frames, position } = resolveSprite(now);
        const base = Math.round(clamp(position, 0, frames - 1));
        setLayer(layerARef.current, key, sheet, frames, base, 1);

        root.style.transform = `translate3d(${state.x - OFF_X}px, ${state.y - OFF_Y}px, 0)`;
      };

      const tick = (now) => {
        const dt = Math.min(0.05, Math.max(0.001, (now - state.lastTime) / 1000));
        state.lastTime = now;

        const ease = 1 - Math.exp(-dt * DEPTH_EASE);
        state.depthSmooth += (state.depth - state.depthSmooth) * ease;
        if (Math.abs(state.depthSmooth - state.depth) < 0.0005) {
          state.depthSmooth = state.depth;
        }

        if (!state.dragging && !state.stuck && (Math.abs(state.vx) > 0.5 || Math.abs(state.vy) > 0.5)) {
          state.x += state.vx * dt;
          state.y += state.vy * dt;
          const { maxX, maxY } = bounds();
          const speed = Math.hypot(state.vx, state.vy);

          if (state.x <= 0) {
            state.x = 0;
            state.side = 'left';
            state.depth = clamp(speed / 900, 0.35, 1);
            state.vx = 0;
            state.vy = 0;
            state.stuck = true;
          } else if (state.x >= maxX) {
            state.x = maxX;
            state.side = 'right';
            state.depth = clamp(speed / 900, 0.35, 1);
            state.vx = 0;
            state.vy = 0;
            state.stuck = true;
          }

          if (state.y <= 0) {
            state.y = 0;
            state.side = 'up';
            state.depth = clamp(speed / 900, 0.35, 1);
            state.vx = 0;
            state.vy = 0;
            state.stuck = true;
          } else if (state.y >= maxY) {
            state.y = maxY;
            state.side = 'down';
            state.depth = clamp(speed / 900, 0.35, 1);
            state.vx = 0;
            state.vy = 0;
            state.stuck = true;
          }

          if (state.stuck) storePosition(state.x, state.y);
        }

        paint(now);

        const busy =
          state.dragging ||
          state.anim !== null ||
          Math.abs(state.vx) + Math.abs(state.vy) > 0.5 ||
          Math.abs(state.depthSmooth - state.depth) > 0.001;
        if (busy) {
          frameRef.current = requestAnimationFrame(tick);
        } else {
          frameRef.current = 0;
        }
      };

      const ensureLoop = () => {
        if (frameRef.current === 0) {
          state.lastTime = performance.now();
          frameRef.current = requestAnimationFrame(tick);
        }
      };

      const playEmotion = (name) => {
        if (state.dragging || state.stuck) return;
        const config = EMOTIONS[name];
        if (!config) return;
        state.anim = { config, start: performance.now() };
        ensureLoop();
      };

      /* ---- session info: context, error, tool activity ----------------- */

      const retainedByMain = sessions?.byId?.[sessionId]?.retainedBy?.mainView ?? 0;

      React.useEffect(() => {
        // A previous session's context/error must never leak into the next one.
        setSessionInfo({ contextPercent: null, error: null, toolActive: false });
        if (!sessionId || !host || typeof host.get !== 'function') return undefined;
        const service = host.get('sessions');
        let cancelled = false;
        let retry = 0;
        const disposers = [];

        const attach = () => {
          if (cancelled) return;
          const binding = service?.binding?.(sessionId);
          if (!binding) {
            // The generation may not be retained yet right after a switch.
            retry = window.setTimeout(attach, 300);
            return;
          }

          const session = binding.session;
          const pressure = session.projections?.faceOf?.('contextPressure');
          const events = binding.eventSource;

          const read = () => {
            const snapshot = session.getSnapshot();
            const value = pressure?.getSnapshot?.();
            const used = value?.projectedTokens ?? value?.pressureTokens;
            const contextPercent =
              used !== undefined && value?.contextWindow
                ? Math.min(100, Math.round((used / value.contextWindow) * 100))
                : null;
            const toolActive = scanToolActivity(events?.getSnapshot?.());
            setSessionInfo((previous) => {
              if (
                previous.contextPercent === contextPercent &&
                previous.error === (snapshot.lastAgentError ?? null) &&
                previous.toolActive === toolActive
              ) {
                return previous;
              }
              return { contextPercent, error: snapshot.lastAgentError ?? null, toolActive };
            });
          };

          read();
          disposers.push(
            session.subscribe?.(read),
            pressure?.subscribe?.(read),
            events?.subscribe?.(read),
          );
        };

        attach();
        return () => {
          cancelled = true;
          window.clearTimeout(retry);
          for (const dispose of disposers) if (typeof dispose === 'function') dispose();
        };
      }, [sessionId, host, retainedByMain]);

      /* ---- cloud content ---------------------------------------------- */

      const metaRef = React.useRef({
        lastActive: Date.now(),
        busySince: 0,
        breakUntil: 0,
        breakShownAt: 0,
        nextThoughtAt: Date.now() + 60_000,
        thought: null,
        thoughtUntil: 0,
        errorSeen: null,
        errorUntil: 0,
      });

      React.useEffect(() => {
        const timer = window.setInterval(() => {
          const now = Date.now();
          const live = liveRef.current;
          const running = live.status?.running === true;
          const waiting = Boolean(live.status?.pendingInteraction);
          const dragging = live.state?.dragging === true;
          const meta = metaRef.current;

          if (running || dragging) {
            meta.lastActive = now;
            if (!meta.busySince) meta.busySince = now;
          } else {
            meta.busySince = 0;
          }

          if (live.sessionInfo.error && live.sessionInfo.error !== meta.errorSeen) {
            meta.errorSeen = live.sessionInfo.error;
            meta.errorUntil = now + 6000;
          }
          if (!live.sessionInfo.error) meta.errorSeen = null;

          if (!running && now > meta.nextThoughtAt) {
            meta.thought = THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)];
            meta.thoughtUntil = now + 3600;
            meta.nextThoughtAt = now + 70_000 + Math.random() * 90_000;
          }

          if (
            meta.busySince &&
            now - meta.busySince > BREAK_AFTER_MS &&
            now - meta.breakShownAt > BREAK_REPEAT_MS
          ) {
            meta.breakShownAt = now;
            meta.breakUntil = now + 9000;
          }

          const hour = new Date().getHours();
          const idleFor = now - meta.lastActive;
          const sleeping =
            idleFor > IDLE_MS || ((hour >= 23 || hour < 8) && idleFor > NIGHT_IDLE_MS);

          let next = null;
          if (live.hovered && live.sessionInfo.contextPercent !== null) {
            next = {
              text: tr('context.percent', { percent: live.sessionInfo.contextPercent }),
              tone: 'info',
            };
          } else if (waiting) {
            next = { text: tr('status.waiting'), tone: 'wait' };
          } else if (now < meta.errorUntil) {
            next = { text: tr('status.error'), tone: 'error' };
          } else if (now < meta.breakUntil) {
            // Break advice must win over the running status, otherwise it only
            // appears after the work is already over.
            next = { text: tr('break.suggest'), tone: 'info' };
          } else if (running) {
            next = {
              text: tr(live.sessionInfo.toolActive ? 'status.working' : 'status.thinking'),
              tone: 'work',
            };
          } else if (
            live.sessionInfo.contextPercent !== null &&
            live.sessionInfo.contextPercent >= 80
          ) {
            next = {
              text: tr('context.percent', { percent: live.sessionInfo.contextPercent }),
              tone: 'warn',
            };
          } else if (sleeping) {
            next = { text: tr('sleep.zzz'), tone: 'sleep' };
          } else if (now < meta.thoughtUntil) {
            next = { text: tr(meta.thought), tone: 'thought' };
          }

          if (dragging) next = null;

          setBelow((live.state?.y ?? 0) < 96);
          setCloud((previous) => {
            if (!next) return previous === null ? previous : null;
            if (previous && previous.text === next.text && previous.tone === next.tone) {
              return previous;
            }
            return next;
          });
        }, 500);

        return () => window.clearInterval(timer);
      }, []);

      React.useEffect(() => {
        const measure = () => {
          const node = cloudRef.current;
          if (!node) return;
          const rect = node.getBoundingClientRect();
          const margin = 8;
          const delta =
            rect.right > window.innerWidth - margin
              ? window.innerWidth - margin - rect.right
              : rect.left < margin
                ? margin - rect.left
                : 0;
          if (Math.abs(delta) > 0.5) setCloudShift((previous) => previous + delta);
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
      }, [cloud?.text, below]);

      React.useEffect(() => {
        const update = () => setVisible(!document.hidden);
        document.addEventListener('visibilitychange', update);
        update();
        return () => document.removeEventListener('visibilitychange', update);
      }, []);

      React.useEffect(() => {
        if (!visible) {
          setBreathing(false);
          return undefined;
        }
        const reduced =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) return undefined;

        // Breathing runs in short sessions instead of forever: that keeps the
        // compositor asleep most of the time and drops idle GPU usage to zero.
        let cancelled = false;
        let startTimer = 0;
        let endTimer = 0;
        const schedule = () => {
          startTimer = window.setTimeout(
            () => {
              if (cancelled) return;
              setBreathing(true);
              endTimer = window.setTimeout(() => {
                if (cancelled) return;
                setBreathing(false);
                schedule();
              }, 3600 + Math.random() * 400);
            },
            25_000 + Math.random() * 15_000,
          );
        };
        schedule();
        return () => {
          cancelled = true;
          window.clearTimeout(startTimer);
          window.clearTimeout(endTimer);
        };
      }, [visible]);

      const openSession = () => {
        if (!sessionId || !host || typeof host.get !== 'function') return;
        const workspace = host.get('uiWorkspace');
        workspace?.openSession?.(sessionId);
      };

      /* ---- pointer handling ------------------------------------------- */

      const onPointerDown = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        if (state.dragging) return;
        const hit = hitRef.current;
        if (!hit) return;

        hit.setPointerCapture?.(event.pointerId);
        state.dragging = true;
        state.stuck = false;
        state.anim = null;
        state.pointerId = event.pointerId;
        state.vx = 0;
        state.vy = 0;
        state.grabX = event.clientX - state.x;
        state.grabY = event.clientY - state.y;
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        state.lastTime = performance.now();
        state.lastMoveAt = performance.now();
        hit.style.cursor = 'grabbing';
        ensureLoop();
        event.preventDefault();
      };

      const onPointerMove = (event) => {
        if (!state.dragging || event.pointerId !== state.pointerId) return;

        const now = performance.now();
        const dt = Math.max(0.001, (now - state.lastTime) / 1000);
        const rawVx = (event.clientX - state.lastX) / dt;
        const rawVy = (event.clientY - state.lastY) / dt;
        // A pause longer than 100 ms breaks the velocity chain, so a slow
        // reposition followed by a wait does not launch the pet.
        if (now - state.lastMoveAt > 100) {
          state.vx = rawVx;
          state.vy = rawVy;
        } else {
          state.vx = state.vx * 0.4 + rawVx * 0.6;
          state.vy = state.vy * 0.4 + rawVy * 0.6;
        }
        state.lastMoveAt = now;
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        state.lastTime = now;

        const { maxX, maxY } = bounds();
        const desiredX = event.clientX - state.grabX;
        const desiredY = event.clientY - state.grabY;

        const overLeft = -desiredX;
        const overRight = desiredX - maxX;
        const overTop = -desiredY;
        const overBottom = desiredY - maxY;
        const maxOver = Math.max(overLeft, overRight, overTop, overBottom);

        state.x = clamp(desiredX, 0, maxX);
        state.y = clamp(desiredY, 0, maxY);

        if (maxOver > 0) {
          if (maxOver === overLeft) {
            state.x = 0;
            state.side = 'left';
          } else if (maxOver === overRight) {
            state.x = maxX;
            state.side = 'right';
          } else if (maxOver === overTop) {
            state.y = 0;
            state.side = 'up';
          } else {
            state.y = maxY;
            state.side = 'down';
          }
          state.depth = clamp(maxOver / PULL_PX, 0, 1);
        } else {
          state.side = null;
          state.depth = 0;
        }

        ensureLoop();
        event.preventDefault();
      };

      const endDrag = (event) => {
        if (!state.dragging || (event && event.pointerId !== state.pointerId)) return;
        state.dragging = false;
        state.pointerId = null;
        if (hitRef.current) {
          hitRef.current.style.cursor = 'grab';
          if (event) hitRef.current.releasePointerCapture?.(event.pointerId);
        }
        if (performance.now() - state.lastMoveAt > PAUSE_MS) {
          state.vx = 0;
          state.vy = 0;
        }

        const pressed = state.side !== null && state.depth > 0.04;
        if (pressed) {
          state.stuck = true;
          state.vx = 0;
          state.vy = 0;
        } else if (Math.hypot(state.vx, state.vy) >= THROW_THRESHOLD) {
          state.side = null;
          state.depth = 0;
        } else {
          state.vx = 0;
          state.vy = 0;
          state.side = null;
          state.depth = 0;
        }

        storePosition(state.x, state.y);
        ensureLoop();
      };

      /* ---- lifecycle --------------------------------------------------- */

      React.useEffect(() => {
        for (const item of [...Object.values(SQUASH), ...Object.values(EMOTIONS)]) {
          const img = new Image();
          img.src = item.sheet;
        }

        let emotionTimer = 0;
        let count = 0;
        const scheduleEmotion = () => {
          emotionTimer = window.setTimeout(
            () => {
              const reduced =
                typeof window.matchMedia === 'function' &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              if (!reduced && !state.dragging && !state.stuck) {
                count += 1;
                if (count % 6 === 0) {
                  playEmotion(count % 12 === 0 ? 'joy' : 'tail');
                } else {
                  playEmotion('blink');
                }
              }
              scheduleEmotion();
            },
            1900 + Math.random() * 2600,
          );
        };
        scheduleEmotion();

        const onResize = () => {
          const { maxX, maxY } = bounds();
          if (state.stuck && state.side) {
            // A pet stuck to a wall must follow that wall when the window moves.
            if (state.side === 'left') state.x = 0;
            else if (state.side === 'right') state.x = maxX;
            else if (state.side === 'up') state.y = 0;
            else if (state.side === 'down') state.y = maxY;
          }
          state.x = clamp(state.x, 0, maxX);
          state.y = clamp(state.y, 0, maxY);
          paint(performance.now());
        };
        window.addEventListener('resize', onResize);
        paint(performance.now());
        return () => {
          window.removeEventListener('resize', onResize);
          window.clearTimeout(emotionTimer);
          if (frameRef.current) cancelAnimationFrame(frameRef.current);
          frameRef.current = 0;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      const layerStyle = {
        position: 'absolute',
        inset: 0,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: '0 0',
        pointerEvents: 'none',
        willChange: 'background-position, opacity',
      };

      const toneColor =
        cloud?.tone === 'error'
          ? '#b3261e'
          : cloud?.tone === 'wait'
            ? '#a35a00'
            : cloud?.tone === 'warn'
              ? '#8a5b00'
              : '#1d2436';

      return h(
        'div',
        {
          ref: rootRef,
          onPointerDown,
          onPointerMove,
          onPointerUp: endDrag,
          onPointerCancel: endDrag,
          style: {
            position: 'fixed',
            left: 0,
            top: 0,
            width: FRAME_CSS_W,
            height: FRAME_CSS_H,
            // The frame is transparent around the character: only the hit
            // box below opts into pointer events, so clicks pass through.
            pointerEvents: 'none',
            touchAction: 'none',
            userSelect: 'none',
            zIndex: 10,
            willChange: 'transform',
          },
        },
        h('style', {
          dangerouslySetInnerHTML: {
            __html: `
@keyframes pw-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.014,1.028)}}
@keyframes pw-pop{from{opacity:0;transform:translate(-50%,-90%) scale(.72)}to{opacity:1;transform:translate(-50%,-100%) scale(1)}}
.pw-cloud{position:absolute;left:50%;top:-6px;transform:translate(-50%,-100%);display:flex;align-items:center;justify-content:center;min-height:26px;max-width:min(190px,60vw);padding:4px 10px;border:3px solid #141a26;border-radius:16px;background:#fff;box-shadow:0 3px 0 rgba(20,26,38,.14);font:700 12px/1.15 ui-sans-serif,system-ui,"Segoe UI",sans-serif;white-space:nowrap;z-index:4;cursor:pointer;appearance:none;pointer-events:auto;animation:pw-pop .18s cubic-bezier(.2,1.5,.4,1)}
.pw-cloud:focus-visible{outline:3px solid #f2b134;outline-offset:2px}
.pw-cloud--below{top:auto;bottom:-6px;transform:translate(-50%,100%)}
.pw-cloud__tail{position:absolute;left:22px;bottom:-9px;width:9px;height:9px;border:3px solid #141a26;border-radius:50%;background:#fff}
.pw-cloud__tail--2{left:14px;bottom:-18px;width:6px;height:6px}
.pw-cloud--below .pw-cloud__tail{bottom:auto;top:-9px}
.pw-cloud--below .pw-cloud__tail--2{top:-18px}
@media (prefers-reduced-motion: reduce){.pw-cloud{animation:none}.pw-breathe--active{animation:none}}
.pw-breathe{transform-origin:50% 100%}
.pw-breathe--active{animation:pw-breathe 3.4s ease-in-out 1}
`,
          },
        }),
        h('div', {
          ref: hitRef,
          'aria-hidden': true,
          style: {
            position: 'absolute',
            left: OFF_X,
            top: OFF_Y,
            width: CHAR_W,
            height: CHAR_H,
            pointerEvents: 'auto',
            cursor: 'grab',
            touchAction: 'none',
          },
        }),
        h(
          'div',
          {
            className: `pw-breathe${breathing ? ' pw-breathe--active' : ''}`,
            'aria-hidden': true,
            style: {
              position: 'absolute',
              inset: 0,
              transformOrigin: '50% 100%',
            },
          },
          h('div', { ref: layerARef, style: layerStyle }),
        ),
        cloud
          ? h(
              'button',
              {
                key: cloud.text,
                ref: cloudRef,
                type: 'button',
                className: `pw-cloud${below ? ' pw-cloud--below' : ''}`,
                'aria-label': tr('aria.cloud', { status: cloud.text }),
                style: {
                  color: toneColor,
                  left: `calc(50% + ${cloudShift}px)`,
                },
                onPointerDown: (event) => event.stopPropagation(),
                onClick: (event) => {
                  event.stopPropagation();
                  openSession();
                },
                onMouseEnter: () => setHovered(true),
                onMouseLeave: () => setHovered(false),
                onFocus: () => setHovered(true),
                onBlur: () => setHovered(false),
              },
              h('span', null, cloud.text),
              h('i', { className: 'pw-cloud__tail', 'aria-hidden': true }),
              h('i', { className: 'pw-cloud__tail pw-cloud__tail--2', 'aria-hidden': true }),
            )
          : null,
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        let localeFace;
        try {
          localeFace = typeof ctx.get === 'function' ? ctx.get('locale') : ctx.locale;
        } catch {
          localeFace = ctx.locale;
        }

        // Registering twice (a reloaded module, another copy of the pet) must
        // never take the whole plugin down; the existing dictionaries are fine.
        try {
          const disposeLocale = localeFace?.register?.(LOCALE_NS, LOCALE_DICT);
          if (typeof disposeLocale === 'function') ctx.effect(() => disposeLocale);
        } catch {
          /* namespace already registered */
        }

        const Bound = (slotProps) =>
          h(Pet, Object.assign({ host: ctx, localeFace }, slotProps));
        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            {
              name: 'shell.overlay',
              id: 'pajama-whale',
              order: 10,
            },
            Bound,
          ),
        );
      },
    };
  },
});
