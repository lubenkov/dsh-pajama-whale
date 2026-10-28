window.__ModuleLoader__.load({
  id: 'dsh-pajama-whale',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const SHEET_SQ_UP = '__SHEET_SQ_UP__';
    const SHEET_SQ_RIGHT = '__SHEET_SQ_RIGHT__';
    const SHEET_SQ_LEFT = '__SHEET_SQ_LEFT__';
    const SHEET_SQ_DOWN = '__SHEET_SQ_DOWN__';
    const SHEET_EMO_BLINK = '__SHEET_EMO_BLINK__';
    const SHEET_EMO_TAIL_WAG = '__SHEET_EMO_TAIL_WAG__';
    const SHEET_EMO_JOY = '__SHEET_EMO_JOY__';
    const SHEET_EMO_THINKING = '__SHEET_EMO_THINKING__';
    const SHEET_EMO_WORKING = '__SHEET_EMO_WORKING__';
    const SHEET_EMO_SURPRISED = '__SHEET_EMO_SURPRISED__';
    const SHEET_EMO_YAWN = '__SHEET_EMO_YAWN__';
    const SHEET_EMO_SLEEPY = '__SHEET_EMO_SLEEPY__';

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
      thinking: { key: 'thinking', sheet: SHEET_EMO_THINKING, frames: 20, fps: 12 },
      working: { key: 'working', sheet: SHEET_EMO_WORKING, frames: 12, fps: 12 },
      surprised: { key: 'surprised', sheet: SHEET_EMO_SURPRISED, frames: 8, fps: 14 },
      yawn: { key: 'yawn', sheet: SHEET_EMO_YAWN, frames: 13, fps: 10 },
      sleepy: { key: 'sleepy', sheet: SHEET_EMO_SLEEPY, frames: 16, fps: 8 },
    };

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
    const DEPTH_EASE = 143;
    const SLEEP_AFTER_MS = 60_000;
    const BREAK_AFTER_MS = 50 * 60_000;
    const BREAK_REPEAT_MS = 45 * 60_000;
    const BREAK_GRACE_MS = 3 * 60_000;

    const LOCALE_NS = 'pajama-whale';

    const LOCALE_DICT = {
      en: {
        'status.thinking': 'thinking',
        'status.working': 'working',
        'status.error': '! error',
        'status.waiting': '?',
        'context.percent': 'context {percent}%',
        'break.suggest': 'take a break?',
        'aria.cloud': 'Pet: {status}',
        'thought.hmm': 'hmm…',
      },
      zh: {
        'status.thinking': '思考中',
        'status.working': '工作中',
        'status.error': '! 出错了',
        'status.waiting': '?',
        'context.percent': '上下文 {percent}%',
        'break.suggest': '休息一下？',
        'aria.cloud': '宠物：{status}',
        'thought.hmm': '嗯…',
      },
    };

    const THOUGHTS = ['thought.hmm'];

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const safeGet = (target, name) => {
      try {
        return typeof target?.get === 'function' ? target.get(name) : undefined;
      } catch {
        return undefined;
      }
    };

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

    const storePosition = (x, y, side = null, depth = 0, stuck = false) => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            xRatio: window.innerWidth > 0 ? clamp(x, 0, window.innerWidth) / window.innerWidth : 0,
            yRatio: window.innerHeight > 0 ? clamp(y, 0, window.innerHeight) / window.innerHeight : 0,
            side,
            depth,
            stuck,
          }),
        );
      } catch {

      }
    };

    const initialPosition = () => {
      const stored = readStoredPosition();
      if (!stored) {
        return {
          x: Math.max(16, window.innerWidth - CHAR_W - 28),
          y: Math.max(16, window.innerHeight - CHAR_H - 96),
          side: null,
          depth: 0,
          stuck: false,
        };
      }
      const maxX = Math.max(0, window.innerWidth - CHAR_W);
      const maxY = Math.max(0, window.innerHeight - CHAR_H);
      let x = clamp(stored.xRatio * window.innerWidth, 0, maxX);
      let y = clamp(stored.yRatio * window.innerHeight, 0, maxY);
      const validSide =
        stored.side === 'left' || stored.side === 'right' || stored.side === 'up' || stored.side === 'down';
      const side = validSide ? stored.side : null;
      const depth = typeof stored.depth === 'number' ? clamp(stored.depth, 0, 1) : 0;
      const stuck = stored.stuck === true && side !== null;
      if (stuck) {
        if (side === 'left') x = 0;
        if (side === 'right') x = maxX;
        if (side === 'up') y = 0;
        if (side === 'down') y = maxY;
      }
      return { x, y, side: stuck ? side : null, depth: stuck ? depth : 0, stuck };
    };

    function Pet(props) {
      const { host, localeFace, uiSession, useSessions, useSessionStatus } = props;

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

      const [debug] = React.useState(() => {
        try {
          return window.localStorage.getItem('pajama-whale:debug') === '1';
        } catch {
          return false;
        }
      });

      const rootRef = React.useRef(null);
      const hitRef = React.useRef(null);
      const layerARef = React.useRef(null);
      const frameRef = React.useRef(0);
      const lastAgentRef = React.useRef(Date.now());
      const lastTouchRef = React.useRef(Date.now());
      const petHoverRef = React.useRef(false);
      const clickUntilRef = React.useRef(0);

      const [uiSessionId, setUiSessionId] = React.useState(undefined);
      const [uiStatus, setUiStatus] = React.useState(null);

      React.useEffect(() => {
        if (!uiSession) return undefined;
        const read = () => {
          const id = uiSession.current?.value?.props?.sessionId;
          const map = uiSession.sessionStatus?.getSnapshot?.();
          setUiSessionId(id);
          setUiStatus(id && map ? (map.get(id) ?? null) : null);
        };
        read();
        const disposers = [
          uiSession.current?.subscribe?.(read),
          uiSession.sessionStatus?.subscribe?.(read),
        ];
        return () => {
          for (const dispose of disposers) if (typeof dispose === 'function') dispose();
        };
      }, [uiSession]);

      const useSessionsHook = typeof useSessions === 'function' ? useSessions : () => undefined;
      const sessions = useSessionsHook((snapshot) => snapshot);
      const sessionId = React.useMemo(
        () => pickSessionId(sessions) ?? uiSessionId,
        [sessions, uiSessionId],
      );

      const useSessionStatusHook =
        typeof useSessionStatus === 'function' ? useSessionStatus : () => undefined;
      const slotStatus = useSessionStatusHook((snapshot) =>
        sessionId ? snapshot.get(sessionId) : undefined,
      );
      const status = slotStatus ?? (uiSessionId && uiSessionId === sessionId ? uiStatus : null);

      const [sessionInfo, setSessionInfo] = React.useState({
        contextPercent: null,
        error: null,
        toolActive: false,
        title: null,
      });
      const [cloud, setCloud] = React.useState(null);
      const [hovered, setHovered] = React.useState(false);
      const [below, setBelow] = React.useState(false);
      const [cloudShift, setCloudShift] = React.useState(0);
      const cloudRef = React.useRef(null);
      const hoverRef = React.useRef(false);
      const lastCloudOpenRef = React.useRef(0);
      const [visible, setVisible] = React.useState(() =>
        typeof document === 'undefined' ? true : !document.hidden,
      );
      const [breathing, setBreathing] = React.useState(false);

      const listPressure =
        sessions?.projectionsBySession?.[sessionId]?.values?.contextPressure ??
        sessions?.byId?.[sessionId]?.projectionValues?.contextPressure;
      const listPercent =
        listPressure?.contextWindow && (listPressure.projectedTokens ?? listPressure.pressureTokens) !== undefined
          ? Math.min(
              100,
              Math.round(
                ((listPressure.projectedTokens ?? listPressure.pressureTokens) /
                  listPressure.contextWindow) *
                  100,
              ),
            )
          : null;
      const contextPercent = sessionInfo.contextPercent ?? listPercent;
      const sessionTitle = sessions?.byId?.[sessionId]?.title ?? sessionInfo.title ?? null;

      const liveRef = React.useRef({});
      liveRef.current = {
        status,
        sessionInfo,
        hovered,
        state: null,
        contextPercent,
        sessionTitle,
        debug,
        debugText: `sid ${sessionId ? String(sessionId).slice(0, 6) : '—'} ui ${
          uiSessionId ? String(uiSessionId).slice(0, 6) : '—'
        } slot ${typeof useSessions === 'function' ? '1' : '0'}${
          typeof useSessionStatus === 'function' ? '1' : '0'
        } run ${status?.running ? '1' : '0'}${uiStatus?.running ? '1' : '0'} ctx ${
          host && typeof host.get === 'function' ? '1' : '0'
        }`,
      };

      const stateRef = React.useRef(null);
      if (stateRef.current === null) {
        const start = initialPosition();
        stateRef.current = {
          x: start.x,
          y: start.y,
          vx: 0,
          vy: 0,
          side: start.side,
          depth: start.depth,
          depthSmooth: start.depth,
          stuck: start.stuck,
          dragging: false,
          pointerId: null,
          grabX: 0,
          grabY: 0,
          lastX: 0,
          lastY: 0,
          lastTime: 0,
          lastPointerTime: 0,
          lastMoveAt: 0,
          downX: 0,
          downY: 0,
          moved: false,
          anim: null,
          pose: 'idle',
          poseStart: 0,
        };
      }
      const state = stateRef.current;
      liveRef.current.state = state;

      const bounds = () => ({
        maxX: Math.max(0, window.innerWidth - CHAR_W),
        maxY: Math.max(0, window.innerHeight - CHAR_H),
      });

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
        if (state.dragging) {
          return { key: NEUTRAL.key, sheet: NEUTRAL.sheet, frames: SQUASH_FRAMES, position: 0 };
        }
        if (state.pose !== 'idle' && EMOTIONS[state.pose]) {
          const config = EMOTIONS[state.pose];
          const elapsed = ((now - state.poseStart) / 1000) * config.fps;
          const position = ((elapsed % config.frames) + config.frames) % config.frames;
          return { key: config.key, sheet: config.sheet, frames: config.frames, position };
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

          if (state.stuck) {
            storePosition(state.x, state.y, state.side, state.depth, true);
          }
        }

        paint(now);

        const busy =
          state.dragging ||
          state.anim !== null ||
          state.pose !== 'idle' ||
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

      const retainedByMain = sessions?.byId?.[sessionId]?.retainedBy?.mainView ?? 0;

      React.useEffect(() => {

        setSessionInfo({ contextPercent: null, error: null, toolActive: false, title: null });
        if (!sessionId || !host || typeof host.get !== 'function') return undefined;
        const service = safeGet(host, 'sessions');
        let cancelled = false;
        let retry = 0;
        const disposers = [];

        const attach = () => {
          if (cancelled) return;
          let binding = null;
          try {
            binding = service?.binding?.(sessionId);
          } catch {
            binding = null;
          }
          if (!binding) {

            retry = window.setTimeout(attach, 300);
            return;
          }

          try {
            const session = binding.session;
            const pressure = session.projections?.faceOf?.('contextPressure');
            const titleFace = session.projections?.faceOf?.('title');
            const events = binding.eventSource;

            const read = () => {
              try {
                const snapshot = session.getSnapshot();
                const value = pressure?.getSnapshot?.();
                const used = value?.projectedTokens ?? value?.pressureTokens;
                const contextPercent =
                  used !== undefined && value?.contextWindow
                    ? Math.min(100, Math.round((used / value.contextWindow) * 100))
                    : null;
                const toolActive = scanToolActivity(events?.getSnapshot?.());
                const titleValue = titleFace?.getSnapshot?.();
                const title =
                  typeof titleValue === 'string' && titleValue !== '' ? titleValue : null;
                setSessionInfo((previous) => {
                  if (
                    previous.contextPercent === contextPercent &&
                    previous.error === (snapshot.lastAgentError ?? null) &&
                    previous.toolActive === toolActive &&
                    previous.title === title
                  ) {
                    return previous;
                  }
                  return {
                    contextPercent,
                    error: snapshot.lastAgentError ?? null,
                    toolActive,
                    title,
                  };
                });
              } catch {

              }
            };

            read();
            const track = (subscribe) => {
              if (typeof subscribe !== 'function') return;
              try {
                disposers.push(subscribe(read));
              } catch {

              }
            };
            track(session.subscribe);
            track(pressure?.subscribe);
            track(titleFace?.subscribe);
            track(events?.subscribe);
          } catch {
            retry = window.setTimeout(attach, 300);
          }
        };

        attach();
        return () => {
          cancelled = true;
          window.clearTimeout(retry);
          for (const dispose of disposers) if (typeof dispose === 'function') dispose();
        };
      }, [sessionId, host, retainedByMain]);

      const metaRef = React.useRef({
        lastActive: Date.now(),
        busySince: 0,
        breakUntil: 0,
        breakShownAt: 0,
        idleSince: 0,
        nextThoughtAt: Date.now() + 60_000,
        thought: null,
        thoughtUntil: 0,
        errorSeen: null,
        errorUntil: 0,
        highContext: false,
        wasRunning: false,
      });

      React.useEffect(() => {
        const timer = window.setInterval(() => {
          const now = Date.now();
          const live = liveRef.current;
          const running = live.status?.running === true;
          const waiting = Boolean(live.status?.pendingInteraction);
          const dragging = live.state?.dragging === true;
          const meta = metaRef.current;

          if (petHoverRef.current) lastTouchRef.current = now;

          if (running || dragging) {
            meta.lastActive = now;
            meta.idleSince = 0;
            if (running) lastAgentRef.current = now;
            if (!meta.busySince) meta.busySince = now;
          } else {
            if (!meta.idleSince) meta.idleSince = now;
            if (now - meta.idleSince > BREAK_GRACE_MS) meta.busySince = 0;
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

          if (meta.wasRunning && !running) {
            meta.wasRunning = false;
            if (!dragging && !live.state?.stuck) playEmotion('joy');
          }
          if (running) meta.wasRunning = true;

          const quietFor = now - Math.max(lastAgentRef.current, lastTouchRef.current);
          const sleeping = !running && quietFor > SLEEP_AFTER_MS;
          const pose = running
            ? live.sessionInfo.toolActive
              ? 'working'
              : 'thinking'
            : sleeping
              ? 'sleepy'
              : 'idle';
          if (live.state && live.state.pose !== pose) {
            live.state.pose = pose;
            live.state.poseStart = now;
            ensureLoop();
          }

          if (live.contextPercent !== null) {
            if (live.contextPercent >= 80 && !meta.highContext) {
              meta.highContext = true;
              if (!dragging && !live.state?.stuck) playEmotion('surprised');
            } else if (live.contextPercent < 75) {
              meta.highContext = false;
            }
          }

          const contextLine =
            live.contextPercent !== null
              ? {
                  text: tr('context.percent', { percent: live.contextPercent }),
                  tone: 'info',
                }
              : {
                  text: live.sessionTitle ? String(live.sessionTitle).slice(0, 32) : '…',
                  tone: 'info',
                };

          let next = null;
          if (live.debug) {
            next = { text: live.debugText, tone: 'info' };
          } else if (now < clickUntilRef.current) {
            next = contextLine;
          } else if (live.hovered) {
            next = contextLine;
          } else if (waiting) {
            next = { text: tr('status.waiting'), tone: 'wait' };
          } else if (now < meta.errorUntil) {
            next = { text: tr('status.error'), tone: 'error' };
          } else if (now < meta.breakUntil) {
            next = { text: tr('break.suggest'), tone: 'info' };
          } else if (live.contextPercent !== null && live.contextPercent >= 80) {
            next = {
              text: tr('context.percent', { percent: live.contextPercent }),
              tone: 'warn',
            };
          } else if (!running && !sleeping && now < meta.thoughtUntil) {
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
          measureCloudRef.current();
        }, 500);

        return () => window.clearInterval(timer);
      }, []);

      const measureCloud = () => {
        const node = cloudRef.current;
        if (!node) {
          setCloudShift((previous) => (previous === 0 ? previous : 0));
          return;
        }
        const root = rootRef.current;
        if (!root) return;
        const width = node.offsetWidth;
        if (width === 0) return;
        const rootRect = root.getBoundingClientRect();
        const anchorX = rootRect.left + rootRect.width / 2;
        const margin = 8;
        const baseLeft = anchorX - width / 2;
        const targetLeft = Math.min(
          Math.max(baseLeft, margin),
          Math.max(margin, window.innerWidth - margin - width),
        );
        const shift = targetLeft - baseLeft;
        setCloudShift((previous) => (Math.abs(previous - shift) < 0.5 ? previous : shift));
      };
      const measureCloudRef = React.useRef(measureCloud);
      measureCloudRef.current = measureCloud;

      React.useEffect(() => {
        measureCloudRef.current();
        const onResize = () => measureCloudRef.current();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
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
        try {
          const workspace = host.get('uiWorkspace');
          workspace?.openSession?.(sessionId);
        } catch {

        }
      };

      React.useEffect(() => {
        const insideRect = (event, node) => {
          if (!node) return false;
          const rect = node.getBoundingClientRect();
          return (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
          );
        };

        const wake = () => {
          if (state.pose !== 'sleepy') return;
          state.pose = 'idle';
          state.poseStart = performance.now();
          playEmotion('yawn');
          ensureLoop();
        };

        const onMove = (event) => {
          const insideCloud = insideRect(event, cloudRef.current);
          if (insideCloud !== hoverRef.current) {
            hoverRef.current = insideCloud;
            setHovered(insideCloud);
          }
          const touching = insideCloud || insideRect(event, hitRef.current);
          petHoverRef.current = touching;
          if (touching) {
            lastTouchRef.current = Date.now();
            wake();
          }
        };

        const onDown = (event) => {
          if (!insideRect(event, cloudRef.current)) return;
          lastCloudOpenRef.current = performance.now();
          openSession();
        };

        const onLeave = () => {
          petHoverRef.current = false;
        };

        window.addEventListener('pointermove', onMove, { passive: true, capture: true });
        window.addEventListener('pointerdown', onDown, true);
        document.addEventListener('pointerleave', onLeave);
        return () => {
          window.removeEventListener('pointermove', onMove, true);
          window.removeEventListener('pointerdown', onDown, true);
          document.removeEventListener('pointerleave', onLeave);
        };

      }, [sessionId]);

      const onPointerDown = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        if (state.dragging) return;
        const hit = hitRef.current;
        if (!hit) return;

        try {
          hit.setPointerCapture?.(event.pointerId);
        } catch {

        }
        const wasSleeping = state.pose === 'sleepy';
        state.dragging = true;
        state.stuck = false;
        state.anim = null;
        state.pose = 'idle';
        if (wasSleeping) {
          state.anim = { config: EMOTIONS.yawn, start: performance.now() };
        }
        state.downX = event.clientX;
        state.downY = event.clientY;
        state.moved = false;
        lastTouchRef.current = Date.now();
        state.pointerId = event.pointerId;
        state.vx = 0;
        state.vy = 0;
        state.grabX = event.clientX - state.x;
        state.grabY = event.clientY - state.y;
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        state.lastTime = performance.now();
        state.lastPointerTime = performance.now();
        state.lastMoveAt = performance.now();
        hit.style.cursor = 'grabbing';
        ensureLoop();
        event.preventDefault();
      };

      const onPointerMove = (event) => {
        if (!state.dragging || event.pointerId !== state.pointerId) return;

        const now = performance.now();
        const dt = Math.max(0.001, (now - state.lastPointerTime) / 1000);
        const rawVx = (event.clientX - state.lastX) / dt;
        const rawVy = (event.clientY - state.lastY) / dt;
        if (Math.hypot(event.clientX - state.downX, event.clientY - state.downY) > 5) {
          state.moved = true;
        }
        lastTouchRef.current = Date.now();

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
        state.lastPointerTime = now;
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
        if (!state.moved) clickUntilRef.current = Date.now() + 5000;
        state.dragging = false;
        state.pointerId = null;
        if (hitRef.current) {
          hitRef.current.style.cursor = 'grab';
          if (event) {
            try {
              hitRef.current.releasePointerCapture?.(event.pointerId);
            } catch {

            }
          }
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

        storePosition(state.x, state.y, state.side, state.depth, state.stuck);
        ensureLoop();
      };

      React.useEffect(() => {
        for (const item of [...Object.values(SQUASH), ...Object.values(EMOTIONS)]) {
          const img = new Image();
          img.src = item.sheet;
        }

        let emotionTimer = 0;
        const scheduleEmotion = () => {
          emotionTimer = window.setTimeout(
            () => {
              const reduced =
                typeof window.matchMedia === 'function' &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              if (
                !reduced &&
                !state.dragging &&
                !state.stuck &&
                state.pose === 'idle' &&
                !state.anim
              ) {
                const roll = Math.random();
                if (roll < 0.75) playEmotion('blink');
                else playEmotion('tail');
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
                  if (performance.now() - lastCloudOpenRef.current < 400) return;
                  openSession();
                },
                onPointerEnter: () => setHovered(true),
                onPointerLeave: () => setHovered(false),
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

        try {
          const disposeLocale = localeFace?.register?.(LOCALE_NS, LOCALE_DICT);
          if (typeof disposeLocale === 'function') ctx.effect(() => disposeLocale);
        } catch {

        }

        let uiSession;
        try {
          uiSession = typeof ctx.get === 'function' ? ctx.get('uiSession') : undefined;
        } catch {
          uiSession = undefined;
        }

        const Bound = (slotProps) =>
          h(Pet, Object.assign({ host: ctx, localeFace, uiSession }, slotProps));
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
