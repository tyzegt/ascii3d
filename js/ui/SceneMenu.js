window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.SceneMenu = (function () {
    'use strict';

    var Debug = A3D.modules.Debug;

    var open = false;
    var selected = 0;
    var items = [];
    var overlay = null;
    var listEl = null;
    var statusEl = null;
    var fileInput = null;
    var onPick = null;

    function build() {
        if (overlay) return;

        overlay = document.createElement('div');
        overlay.id = 'scene-menu';
        overlay.style.display = 'none';
        overlay.style.position = 'fixed';
        overlay.style.top = '50%';
        overlay.style.left = '50%';
        overlay.style.transform = 'translate(-50%, -50%)';
        overlay.style.zIndex = '20';
        overlay.style.minWidth = '340px';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.92)';
        overlay.style.border = '1px solid #0f0';
        overlay.style.boxShadow = '0 0 24px rgba(0, 255, 0, 0.35)';
        overlay.style.color = '#0f0';
        overlay.style.fontFamily = 'monospace';
        overlay.style.fontSize = '14px';
        overlay.style.padding = '14px 18px';

        listEl = document.createElement('div');
        listEl.id = 'scene-menu-list';
        listEl.style.lineHeight = '1.7';

        statusEl = document.createElement('div');
        statusEl.id = 'scene-menu-status';
        statusEl.style.marginTop = '10px';
        statusEl.style.paddingTop = '8px';
        statusEl.style.borderTop = '1px dashed #0a0';
        statusEl.style.color = '#8f8';
        statusEl.style.fontSize = '12px';

        overlay.appendChild(listEl);
        overlay.appendChild(statusEl);
        document.body.appendChild(overlay);

        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json,application/json';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', onFileChosen);
        document.body.appendChild(fileInput);
        Debug.log('SceneMenu', 'initialized');
    }

    function renderItems() {
        if (!listEl) return;
        listEl.textContent = '';
        items.forEach(function (item, i) {
            var line = document.createElement('div');
            line.textContent = (i === selected ? '> ' : '  ') + item.label;
            line.style.color = (i === selected) ? '#ff0' : '#0f0';
            listEl.appendChild(line);
        });
    }

    function refresh() {
        items = A3D.SceneRegistry.listScenes().map(function (name) {
            return { label: name, sceneName: name };
        });
        items.push({ label: '- Load from file… -', fileItem: true });
        if (selected >= items.length) selected = 0;
        renderItems();
    }

    function toggle() {
        open = !open;
        if (open) {
            refresh();
            overlay.style.display = 'block';
            setStatus('↑/↓ - choice, Enter - load, Esc - close');
        } else {
            overlay.style.display = 'none';
        }
        return open;
    }

    function setOpen(value) {
        if (open !== !!value) toggle();
    }

    function isOpen() {
        return open;
    }

    function setStatus(text) {
        if (statusEl) statusEl.textContent = text || '';
    }

    function move(delta) {
        if (!open || items.length === 0) return;
        selected = (selected + delta + items.length) % items.length;
        renderItems();
    }

    function activate() {
        var item = items[selected];
        if (!item) return;
        if (item.fileItem) {
            fileInput.value = '';
            fileInput.click();
            return;
        }
        if (onPick) {
            toggle();
            onPick(item.sceneName);
        }
    }

    function onFileChosen() {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
            try {
                var data = JSON.parse(e.target.result);
                if (onPick) {
                    toggle();
                    onPick(null, data);
                }
            } catch (err) {
                Debug.error('SceneMenu', 'file parse failed:', err && err.message ? err.message : err);
                setStatus('Load error: invalid JSON');
            }
        };
        reader.onerror = function () {
            Debug.error('SceneMenu', 'file read failed');
            setStatus('Load error: cannot read file');
        };
        reader.readAsText(file);
    }

    return {
        init: function (pickCallback) {
            build();
            onPick = pickCallback;
        },
        toggle: toggle,
        setOpen: setOpen,
        isOpen: isOpen,
        move: move,
        activate: activate,
        setStatus: setStatus
    };
})();
