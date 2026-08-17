window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

// Debug-консоль: мгновенный телепорт камеры (goto/tp) и произвольные команды.
// Открывается клавишей ` (Backquote). Позиция — метры, углы — градусы.
A3D.modules.DebugConsole = (function () {
    'use strict';

    var Debug = A3D.modules.Debug;

    var open = false;
    var overlay = null;
    var logEl = null;
    var inputEl = null;
    var camera = null;

    var HELP = [
        'goto <x> <y> <z> [yawDeg] [pitchDeg] - телепорт камеры',
        'tp  <x> <y> <z> [yawDeg] [pitchDeg] - то же самое (alias)',
        'pos                          - текущая позиция и углы',
        'help                         - список команд'
    ];

    function build() {
        if (overlay) return;

        overlay = document.createElement('div');
        overlay.id = 'debug-console';
        overlay.style.display = 'none';
        overlay.style.position = 'fixed';
        overlay.style.right = '10px';
        overlay.style.bottom = '10px';
        overlay.style.zIndex = '30';
        overlay.style.width = '480px';
        overlay.style.maxWidth = '60vw';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.92)';
        overlay.style.border = '1px solid #f80';
        overlay.style.boxShadow = '0 0 24px rgba(255, 136, 0, 0.35)';
        overlay.style.color = '#fc6';
        overlay.style.fontFamily = 'monospace';
        overlay.style.fontSize = '13px';
        overlay.style.padding = '10px 12px';

        logEl = document.createElement('div');
        logEl.id = 'debug-console-log';
        logEl.style.height = '96px';
        logEl.style.overflowY = 'auto';
        logEl.style.lineHeight = '1.5';
        logEl.style.marginBottom = '8px';
        logEl.style.borderBottom = '1px dashed #a60';
        logEl.textContent = '';

        inputEl = document.createElement('input');
        inputEl.id = 'debug-console-input';
        inputEl.type = 'text';
        inputEl.autocomplete = 'off';
        inputEl.spellcheck = false;
        inputEl.placeholder = 'goto x y z [yaw] [pitch]   (Enter - выполнить, Esc - закрыть)';
        inputEl.style.width = '100%';
        inputEl.style.boxSizing = 'border-box';
        inputEl.style.backgroundColor = '#000';
        inputEl.style.border = 'none';
        inputEl.style.outline = 'none';
        inputEl.style.color = '#fc6';
        inputEl.style.fontFamily = 'monospace';
        inputEl.style.fontSize = '13px';
        inputEl.style.padding = '4px 0';

        overlay.appendChild(logEl);
        overlay.appendChild(inputEl);
        document.body.appendChild(overlay);
        Debug.log('DebugConsole', 'initialized');
    }

    function logLine(text, isError) {
        if (!logEl) return;
        var line = document.createElement('div');
        line.textContent = text;
        if (isError) {
            line.style.color = '#f66';
        }
        logEl.appendChild(line);
        while (logEl.childNodes.length > 200) {
            logEl.removeChild(logEl.firstChild);
        }
        logEl.scrollTop = logEl.scrollHeight;
    }

    function printHelp() {
        HELP.forEach(function (line) {
            logLine(line, false);
        });
    }

    function toggle() {
        open = !open;
        if (!overlay) return open;
        overlay.style.display = open ? 'block' : 'none';
        if (open) {
            inputEl.focus();
            inputEl.select();
        }
        return open;
    }

    function isOpen() {
        return open;
    }

    // Углы приходят в градусах, камера хранит радианы.
    function degToRad(deg) {
        return (deg * Math.PI) / 180;
    }

    function execCommand(raw) {
        var text = String(raw == null ? '' : raw).trim();
        if (!text) return;
        logLine('> ' + text, false);

        var parts = text.split(/\s+/);
        var cmd = parts[0].toLowerCase();
        var args = parts.slice(1);

        if (cmd === 'help' || cmd === '?') {
            printHelp();
            return;
        }
        if (cmd === 'pos') {
            logLine(describeCamera(), false);
            return;
        }
        if (cmd === 'goto' || cmd === 'tp' || cmd === 'teleport') {
            var nums = args.map(parseFloat).filter(function (v) {
                return !isNaN(v);
            });
            if (nums.length < 3) {
                logLine('need: goto x y z [yawDeg] [pitchDeg]', true);
                return;
            }
            teleport(nums[0], nums[1], nums[2],
                nums.length > 3 ? nums[3] : null,
                nums.length > 4 ? nums[4] : null);
            logLine('teleported -> ' + describeCamera(), false);
            return;
        }
        logLine('unknown command "' + cmd + '" (help - список)', true);
    }

    function describeCamera() {
        if (!camera) return 'no camera';
        var rad2deg = 180 / Math.PI;
        return 'pos: ' + camera.position.x.toFixed(2) + ', ' +
            camera.position.y.toFixed(2) + ', ' + camera.position.z.toFixed(2) +
            '   yaw: ' + (camera.yaw * rad2deg).toFixed(1) + '°, pitch: ' +
            (camera.pitch * rad2deg).toFixed(1) + '°';
    }

    // Мгновенный перенос камеры; углы — в градусах, null = оставить как есть.
    function teleport(x, y, z, yawDeg, pitchDeg) {
        if (!camera || typeof camera.setView !== 'function') {
            Debug.error('DebugConsole', 'camera not available');
            return false;
        }
        var yaw = (yawDeg === null || isNaN(yawDeg)) ? camera.yaw : degToRad(yawDeg);
        var pitch = (pitchDeg === null || isNaN(pitchDeg)) ? camera.pitch : degToRad(pitchDeg);
        camera.setView([x, y, z], yaw, pitch);
        Debug.log('DebugConsole', 'teleport to [' + x + ', ' + y + ', ' + z +
            '] yaw=' + (yaw * 180 / Math.PI).toFixed(1) + '° pitch=' + (pitch * 180 / Math.PI).toFixed(1) + '°');
        return true;
    }

    function onInputKeydown(e) {
        if (e.code === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            toggle();
            return;
        }
        if (e.code === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            execCommand(inputEl.value);
            inputEl.value = '';
            return;
        }
        // Не даём клавишам консоли пробрасываться в игру.
        e.stopPropagation();
    }

    return {
        init: function (cameraRef) {
            build();
            camera = cameraRef || null;
            if (inputEl) {
                inputEl.addEventListener('keydown', onInputKeydown);
            }
        },
        toggle: toggle,
        isOpen: isOpen,
        execCommand: execCommand,
        teleport: teleport
    };
})();
