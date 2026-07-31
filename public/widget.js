/**
 * Foreman widget loader.
 *
 * Deliberately plain JavaScript with no dependencies and no build step. This
 * file runs on somebody else's website, so it is held to two rules:
 *
 *   1. Do not slow their page down. Nothing but a button is created on load;
 *      the chat itself is an iframe that does not exist until someone clicks.
 *      A visitor who never opens the chat downloads a couple of kilobytes.
 *
 *   2. Do not touch their page. Everything lives inside a shadow root, so their
 *      CSS cannot break the widget and — the part that actually loses
 *      customers — the widget cannot break their layout.
 */
;(function () {
  'use strict'

  var script = document.currentScript
  if (!script) return

  var botId = script.getAttribute('data-foreman-bot')
  if (!botId) {
    console.error('[Foreman] Missing data-foreman-bot on the script tag.')
    return
  }

  var origin = new URL(script.src, window.location.href).origin
  var accent = script.getAttribute('data-foreman-color') || '#1f2937'
  var label = script.getAttribute('data-foreman-label') || 'Questions? Ask us'

  // Guards against the snippet being pasted twice, which would otherwise stack
  // two buttons on top of each other.
  if (document.getElementById('foreman-widget-root')) return

  var host = document.createElement('div')
  host.id = 'foreman-widget-root'
  var shadow = host.attachShadow({ mode: 'open' })

  var style = document.createElement('style')
  style.textContent = [
    ':host { all: initial; }',
    '.launcher {',
    '  position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;',
    '  display: inline-flex; align-items: center; gap: 8px;',
    '  padding: 12px 18px; border: 0; border-radius: 999px;',
    '  font: 500 15px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;',
    '  color: #fff; cursor: pointer;',
    '  box-shadow: 0 6px 24px rgba(0,0,0,.18);',
    '  transition: transform .15s ease, box-shadow .15s ease;',
    '}',
    '.launcher:hover { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(0,0,0,.22); }',
    '.launcher:focus-visible { outline: 3px solid rgba(0,0,0,.35); outline-offset: 2px; }',
    '.frame {',
    '  position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;',
    '  width: 400px; height: 620px; max-height: calc(100vh - 40px);',
    '  border: 0; border-radius: 16px; background: #fff;',
    '  box-shadow: 0 12px 48px rgba(0,0,0,.24);',
    '}',
    '@media (max-width: 480px) {',
    '  .frame { right: 0; bottom: 0; width: 100vw; height: 100svh; max-height: none; border-radius: 0; }',
    '}',
    '.hidden { display: none; }',
  ].join('\n')

  var launcher = document.createElement('button')
  launcher.className = 'launcher'
  launcher.type = 'button'
  launcher.style.background = accent
  launcher.setAttribute('aria-label', label)
  launcher.textContent = label

  var frame = null

  function openChat() {
    if (!frame) {
      // Created on first open, which is the whole point: until now this widget
      // has cost the host page a button and nothing else.
      frame = document.createElement('iframe')
      frame.className = 'frame'
      frame.src = origin + '/embed/' + encodeURIComponent(botId)
      frame.setAttribute('title', 'Chat')
      frame.setAttribute('allow', 'clipboard-write')
      shadow.appendChild(frame)
    }

    frame.classList.remove('hidden')
    launcher.classList.add('hidden')
  }

  function closeChat() {
    if (frame) frame.classList.add('hidden')
    launcher.classList.remove('hidden')
  }

  launcher.addEventListener('click', openChat)

  window.addEventListener('message', function (event) {
    // Only the frame we created may close it. Without this origin check any
    // script on the page could drive the widget.
    if (event.origin !== origin) return
    if (event.data && event.data.type === 'foreman:close') closeChat()
  })

  shadow.appendChild(style)
  shadow.appendChild(launcher)

  function mount() {
    document.body.appendChild(host)
  }

  if (document.body) mount()
  else document.addEventListener('DOMContentLoaded', mount)
})()
