/* @ds-bundle: {"format":4,"namespace":"Beat1009DesignSystem_b52646","components":[{"name":"Logo","sourcePath":"components/brand/Logo.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"ArticleCard","sourcePath":"components/radio/ArticleCard.jsx"},{"name":"LiveIndicator","sourcePath":"components/radio/LiveIndicator.jsx"},{"name":"NowPlayingBar","sourcePath":"components/radio/NowPlayingBar.jsx"},{"name":"SectionHeading","sourcePath":"components/radio/SectionHeading.jsx"},{"name":"ShowCard","sourcePath":"components/radio/ShowCard.jsx"},{"name":"TrackRow","sourcePath":"components/radio/TrackRow.jsx"}],"sourceHashes":{"components/brand/Logo.jsx":"2d541f2e516b","components/core/Badge.jsx":"31c670bdc25f","components/core/Button.jsx":"a9ca30e61ff3","components/core/Card.jsx":"fd62fb9e63b9","components/core/Icon.jsx":"629218e821d2","components/core/IconButton.jsx":"a72f5ffe4824","components/core/Tag.jsx":"e003d4a3ed53","components/feedback/Dialog.jsx":"5bedd8e4601c","components/feedback/Toast.jsx":"f1b929df4b31","components/feedback/Tooltip.jsx":"a1f1798c4983","components/forms/Checkbox.jsx":"107d4cc62a06","components/forms/Input.jsx":"9716d122dec2","components/forms/Radio.jsx":"bf23d76c4bda","components/forms/Select.jsx":"7f5c906fad0d","components/forms/Switch.jsx":"b92ac047506a","components/navigation/Tabs.jsx":"953b67d07149","components/radio/ArticleCard.jsx":"35d325ea98fd","components/radio/LiveIndicator.jsx":"cdb005e5f2b0","components/radio/NowPlayingBar.jsx":"f34b0f851d03","components/radio/SectionHeading.jsx":"8263bc1cc33f","components/radio/ShowCard.jsx":"d3f8f35a02c1","components/radio/TrackRow.jsx":"6de3e1c01646","ui_kits/web/AppShell.jsx":"0e967c5b8282","ui_kits/web/ArticleScreen.jsx":"044d4a345bb4","ui_kits/web/HomeScreen.jsx":"ef03969bc386","ui_kits/web/PlaylistScreen.jsx":"bf488287bc5f","ui_kits/web/ScheduleScreen.jsx":"5e02309ea334"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.Beat1009DesignSystem_b52646 = window.Beat1009DesignSystem_b52646 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SRC = {
  white: 'assets/logo/beat-1009-white.png',
  black: 'assets/logo/beat-1009-black.png'
};
function Logo({
  tone = 'white',
  height = 28,
  base = '',
  src,
  className = '',
  ...rest
}) {
  const file = src || `${base}${SRC[tone] || SRC.white}`;
  return /*#__PURE__*/React.createElement("img", _extends({
    className: `beat-logo ${className}`,
    src: file,
    alt: "Beat 100.9",
    style: {
      height,
      width: 'auto'
    }
  }, rest));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Logo.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  children,
  variant = 'glass',
  interactive = false,
  media,
  mediaAlt = '',
  className = '',
  ...rest
}) {
  const cls = ['beat-card', variant !== 'glass' ? `is-${variant}` : '', interactive ? 'is-interactive' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), media && /*#__PURE__*/React.createElement("img", {
    className: "beat-card__media",
    src: media,
    alt: mediaAlt
  }), /*#__PURE__*/React.createElement("div", {
    className: "beat-card__body"
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const LUCIDE = 'https://cdn.jsdelivr.net/npm/lucide-static@0.454.0/icons';
const cache = {};
function Icon({
  name,
  size = 18,
  className = '',
  style,
  ...rest
}) {
  const [markup, setMarkup] = React.useState(cache[name] || '');
  React.useEffect(() => {
    if (cache[name]) {
      setMarkup(cache[name]);
      return undefined;
    }
    let alive = true;
    fetch(`${LUCIDE}/${name}.svg`).then(r => r.text()).then(t => {
      cache[name] = t;
      if (alive) setMarkup(t);
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, [name]);
  return /*#__PURE__*/React.createElement("span", _extends({
    "aria-hidden": "true",
    "data-icon": name,
    className: `beat-icon ${className}`,
    style: {
      width: size,
      height: size,
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: markup
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Badge({
  children,
  variant = 'default',
  icon,
  className = '',
  ...rest
}) {
  const cls = ['beat-badge', variant !== 'default' ? `is-${variant}` : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 11
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Button({
  children,
  variant = 'primary',
  size = 'md',
  pill = false,
  block = false,
  iconLeft,
  iconRight,
  as = 'button',
  className = '',
  ...rest
}) {
  const Tag = as;
  const cls = ['beat-btn', variant !== 'primary' ? `is-${variant}` : '', size !== 'md' ? `is-${size}` : '', pill ? 'is-pill' : '', block ? 'is-block' : '', className].filter(Boolean).join(' ');
  const glyph = size === 'lg' ? 18 : 15;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls
  }, rest), iconLeft && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconLeft,
    size: glyph
  }), children, iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: glyph
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function IconButton({
  icon,
  label,
  variant = 'default',
  size = 'md',
  round = false,
  className = '',
  ...rest
}) {
  const cls = ['beat-iconbtn', variant !== 'default' ? `is-${variant}` : '', size !== 'md' ? `is-${size}` : '', round ? 'is-round' : '', className].filter(Boolean).join(' ');
  const glyph = size === 'lg' ? 22 : size === 'sm' ? 14 : 18;
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls,
    "aria-label": label,
    title: label
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: glyph
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tag({
  children,
  selected = false,
  icon,
  className = '',
  ...rest
}) {
  const cls = ['beat-tag', selected ? 'is-selected' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls,
    "aria-pressed": selected
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 13
  }), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function Dialog({
  open = true,
  title,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onClose,
  className = ''
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "beat-scrim",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: `beat-dialog ${className}`,
    role: "dialog",
    "aria-modal": "true",
    "aria-label": title,
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    className: "beat-dialog__title"
  }, title), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "x",
    label: "Cerrar",
    variant: "plain",
    size: "sm",
    onClick: onClose
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-muted)'
    }
  }, children), /*#__PURE__*/React.createElement("div", {
    className: "beat-dialog__actions"
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "ghost",
    size: "sm",
    onClick: onClose
  }, cancelLabel), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    onClick: onConfirm
  }, confirmLabel))));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const GLYPH = {
  info: 'info',
  success: 'check-circle-2',
  error: 'alert-triangle',
  live: 'radio-tower'
};
function Toast({
  children,
  variant = 'info',
  icon,
  className = '',
  ...rest
}) {
  const cls = ['beat-toast', variant !== 'info' ? `is-${variant}` : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    role: "status"
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || GLYPH[variant],
    size: 16
  }), /*#__PURE__*/React.createElement("span", null, children));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function Tooltip({
  label,
  children,
  className = ''
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: `beat-tooltip ${className}`
  }, children, /*#__PURE__*/React.createElement("span", {
    className: "beat-tooltip__bubble",
    role: "tooltip"
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  label,
  checked = false,
  disabled = false,
  onChange,
  className = '',
  ...rest
}) {
  const cls = ['beat-check', checked ? 'is-checked' : '', disabled ? 'is-disabled' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", _extends({
    className: cls
  }, rest), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 1,
      height: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "beat-check__box"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 12
  })), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  hint,
  error,
  icon,
  id,
  className = '',
  ...rest
}) {
  const fieldId = id || `f-${Math.random().toString(36).slice(2, 8)}`;
  return /*#__PURE__*/React.createElement("div", {
    className: "beat-field"
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "beat-field__label",
    htmlFor: fieldId
  }, label), /*#__PURE__*/React.createElement("div", {
    className: `beat-input-wrap ${icon ? 'has-icon' : ''}`
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 15
  }), /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    className: `beat-input ${error ? 'is-error' : ''} ${className}`
  }, rest))), (error || hint) && /*#__PURE__*/React.createElement("span", {
    className: `beat-field__hint ${error ? 'is-error' : ''}`
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Radio({
  label,
  checked = false,
  disabled = false,
  name,
  value,
  onChange,
  className = '',
  ...rest
}) {
  const cls = ['beat-check', 'is-round', checked ? 'is-checked' : '', disabled ? 'is-disabled' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", _extends({
    className: cls
  }, rest), /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: name,
    value: value,
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 1,
      height: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "beat-check__box"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 'var(--r-pill)',
      background: 'currentColor'
    }
  })), label);
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  label,
  hint,
  options = [],
  id,
  className = '',
  children,
  ...rest
}) {
  const fieldId = id || `s-${Math.random().toString(36).slice(2, 8)}`;
  return /*#__PURE__*/React.createElement("div", {
    className: "beat-field"
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "beat-field__label",
    htmlFor: fieldId
  }, label), /*#__PURE__*/React.createElement("select", _extends({
    id: fieldId,
    className: `beat-select ${className}`
  }, rest), children || options.map(o => typeof o === 'string' ? /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o) : /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), hint && /*#__PURE__*/React.createElement("span", {
    className: "beat-field__hint"
  }, hint));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Switch({
  label,
  checked = false,
  disabled = false,
  onChange,
  className = '',
  ...rest
}) {
  const cls = ['beat-switch', checked ? 'is-on' : '', disabled ? 'is-disabled' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", _extends({
    className: cls
  }, rest), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    role: "switch",
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 1,
      height: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "beat-switch__track"
  }, /*#__PURE__*/React.createElement("span", {
    className: "beat-switch__knob"
  })), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  tabs = [],
  value,
  onChange,
  variant = 'underline',
  className = ''
}) {
  const items = tabs.map(t => typeof t === 'string' ? {
    value: t,
    label: t
  } : t);
  const active = value ?? items[0]?.value;
  return /*#__PURE__*/React.createElement("div", {
    className: `beat-tabs ${variant === 'pills' ? 'is-pills' : ''} ${className}`,
    role: "tablist"
  }, items.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.value,
    role: "tab",
    "aria-selected": t.value === active,
    className: `beat-tab ${t.value === active ? 'is-active' : ''}`,
    onClick: () => onChange && onChange(t.value)
  }, t.label)));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/radio/ArticleCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ArticleCard({
  category,
  title,
  excerpt,
  date,
  image,
  size = 'md',
  href = '#',
  className = '',
  ...rest
}) {
  const big = size === 'lg';
  return /*#__PURE__*/React.createElement("a", _extends({
    className: `beat-article ${className}`,
    href: href,
    style: {
      color: 'inherit'
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      aspectRatio: big ? '16/9' : '4/3',
      borderRadius: 'var(--r-media)',
      overflow: 'hidden',
      background: 'var(--surface-sunken)'
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--tex-grid)',
      backgroundSize: 'var(--tex-grid-size)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--s-4)'
    }
  }, category && /*#__PURE__*/React.createElement("span", {
    className: "beat-article__cat"
  }, category), /*#__PURE__*/React.createElement("span", {
    className: "beat-article__title",
    style: {
      fontSize: big ? 'var(--size-h3)' : 'var(--size-h4)'
    }
  }, title), excerpt && /*#__PURE__*/React.createElement("span", {
    className: "beat-article__excerpt"
  }, excerpt), date && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-mono)',
      color: 'var(--text-faint)',
      textTransform: 'uppercase'
    }
  }, date)));
}
Object.assign(__ds_scope, { ArticleCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/radio/ArticleCard.jsx", error: String((e && e.message) || e) }); }

// components/radio/LiveIndicator.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function LiveIndicator({
  label = 'En vivo',
  bars = false,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `beat-live ${className}`
  }, rest), bars ? /*#__PURE__*/React.createElement("span", {
    className: "beat-eq",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null)) : /*#__PURE__*/React.createElement("span", {
    className: "beat-live__dot",
    "aria-hidden": "true"
  }), label);
}
Object.assign(__ds_scope, { LiveIndicator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/radio/LiveIndicator.jsx", error: String((e && e.message) || e) }); }

// components/radio/NowPlayingBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const BARS = [0.35, 0.6, 0.9, 0.5, 0.75, 1, 0.45, 0.8, 0.55, 0.95, 0.4, 0.7, 0.85, 0.5, 0.65, 0.9, 0.35, 0.6, 0.8, 0.45, 0.7, 0.55, 0.9, 0.4, 0.75, 0.6, 0.85, 0.5];
function NowPlayingBar({
  title,
  artist,
  art,
  playing = false,
  live = true,
  progress = 62,
  onToggle,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `beat-player ${className}`
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: playing ? 'pause' : 'play',
    label: playing ? 'Pausar' : 'Reproducir',
    variant: "live",
    size: "lg",
    round: true,
    onClick: onToggle
  }), art ? /*#__PURE__*/React.createElement("img", {
    className: "beat-player__art",
    src: art,
    alt: ""
  }) : /*#__PURE__*/React.createElement("span", {
    className: "beat-player__art",
    style: {
      background: 'var(--tex-grid)',
      backgroundSize: '14px 14px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "beat-player__now"
  }, /*#__PURE__*/React.createElement("span", {
    className: "beat-player__title"
  }, title), /*#__PURE__*/React.createElement("span", {
    className: "beat-player__sub"
  }, artist)), /*#__PURE__*/React.createElement("div", {
    className: "beat-player__wave",
    "aria-hidden": "true"
  }, BARS.map((h, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: i / BARS.length * 100 < progress ? 'is-hot' : '',
    style: {
      height: `${Math.round(h * 100)}%`,
      opacity: playing ? 1 : 0.5
    }
  }))), live && /*#__PURE__*/React.createElement(__ds_scope.LiveIndicator, {
    bars: playing,
    label: "Al aire"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--s-3)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "volume-2",
    label: "Volumen",
    variant: "plain",
    size: "sm"
  }), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "heart",
    label: "Guardar",
    variant: "plain",
    size: "sm"
  }), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "share-2",
    label: "Compartir",
    variant: "plain",
    size: "sm"
  })));
}
Object.assign(__ds_scope, { NowPlayingBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/radio/NowPlayingBar.jsx", error: String((e && e.message) || e) }); }

// components/radio/SectionHeading.jsx
try { (() => {
function SectionHeading({
  kicker,
  title,
  actionLabel,
  onAction,
  href,
  className = ''
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `beat-sectionhead ${className}`
  }, /*#__PURE__*/React.createElement("div", null, kicker && /*#__PURE__*/React.createElement("div", {
    className: "beat-sectionhead__kicker"
  }, kicker), /*#__PURE__*/React.createElement("h2", {
    className: "beat-sectionhead__title"
  }, title)), actionLabel && /*#__PURE__*/React.createElement("a", {
    className: "beat-btn is-ghost is-sm",
    href: href || '#',
    onClick: onAction,
    style: {
      color: 'var(--text-muted)',
      flex: 'none'
    }
  }, actionLabel, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "arrow-up-right",
    size: 14
  })));
}
Object.assign(__ds_scope, { SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/radio/SectionHeading.jsx", error: String((e && e.message) || e) }); }

// components/radio/ShowCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ShowCard({
  name,
  host,
  schedule,
  genre,
  image,
  live = false,
  onPlay,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("article", _extends({
    className: `beat-show ${className}`
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "beat-show__media"
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: ""
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--tex-grid)',
      backgroundSize: 'var(--tex-grid-size)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-mono)',
      color: 'var(--text-faint)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--track-label)'
    }
  }, "Foto")), /*#__PURE__*/React.createElement("div", {
    className: "beat-show__scrim"
  }), /*#__PURE__*/React.createElement("div", {
    className: "beat-show__badge"
  }, live ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    variant: "live"
  }, "En vivo") : genre ? /*#__PURE__*/React.createElement(__ds_scope.Badge, null, genre) : null), onPlay && /*#__PURE__*/React.createElement("div", {
    className: "beat-show__play"
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "play",
    label: `Reproducir ${name}`,
    variant: "live",
    round: true,
    onClick: onPlay
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--s-2)'
    }
  }, /*#__PURE__*/React.createElement("h4", {
    className: "beat-show__name"
  }, name), host && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-muted)'
    }
  }, host), /*#__PURE__*/React.createElement("span", {
    className: "beat-show__meta"
  }, live ? /*#__PURE__*/React.createElement(__ds_scope.LiveIndicator, {
    label: schedule
  }) : schedule)));
}
Object.assign(__ds_scope, { ShowCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/radio/ShowCard.jsx", error: String((e && e.message) || e) }); }

// components/radio/TrackRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function TrackRow({
  index,
  title,
  artist,
  art,
  time,
  playing = false,
  onPlay,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `beat-track ${playing ? 'is-playing' : ''} ${className}`
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "beat-track__idx"
  }, playing ? /*#__PURE__*/React.createElement("span", {
    className: "beat-eq",
    style: {
      color: 'var(--text-live)'
    }
  }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null)) : String(index).padStart(2, '0')), art ? /*#__PURE__*/React.createElement("img", {
    className: "beat-track__art",
    src: art,
    alt: ""
  }) : /*#__PURE__*/React.createElement("span", {
    className: "beat-track__art",
    style: {
      background: 'var(--tex-grid)',
      backgroundSize: '12px 12px'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "beat-track__title",
    style: {
      display: 'block'
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    className: "beat-track__artist"
  }, artist)), /*#__PURE__*/React.createElement("span", {
    className: "beat-track__time"
  }, time), onPlay ? /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: playing ? 'pause' : 'play',
    label: playing ? 'Pausar' : 'Reproducir',
    variant: "plain",
    size: "sm",
    onClick: onPlay
  }) : /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "more-horizontal",
    size: 16,
    style: {
      color: 'var(--text-faint)'
    }
  }));
}
Object.assign(__ds_scope, { TrackRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/radio/TrackRow.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/AppShell.jsx
try { (() => {
const {
  Logo,
  Button,
  IconButton,
  Icon,
  NowPlayingBar,
  Tag
} = window.Beat1009DesignSystem_b52646;
const NAV = ['Inicio', 'Radio', 'Beat News', 'Lanzamientos', 'Beat Ten', 'Promociones'];
function Header({
  route,
  onRoute,
  onTuneIn,
  logoTone = 'black',
  headerBg = 'rgba(250,251,250,.72)'
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 'var(--z-header)',
      height: 'var(--header-h)',
      display: 'flex',
      alignItems: 'center',
      gap: 'clamp(var(--s-6), 2.5vw, var(--s-9))',
      padding: '0 var(--container-pad)',
      background: headerBg,
      backdropFilter: 'var(--glass-blur)',
      boxShadow: 'inset 0 -1px 0 var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onRoute('Inicio');
    },
    style: {
      display: 'flex',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    tone: logoTone,
    height: 22,
    base: "../../"
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 'clamp(var(--s-5), 1.6vw, var(--s-7))',
      flex: 1,
      minWidth: 0,
      overflow: 'hidden'
    }
  }, NAV.map(n => /*#__PURE__*/React.createElement("a", {
    key: n,
    href: "#",
    onClick: e => {
      e.preventDefault();
      onRoute(n);
    },
    style: {
      font: 'var(--type-label)',
      letterSpacing: 'var(--track-label)',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      color: n === route ? 'var(--text-primary)' : 'var(--text-muted)'
    }
  }, n))), /*#__PURE__*/React.createElement(IconButton, {
    icon: "search",
    label: "Buscar",
    variant: "plain",
    size: "sm"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "live",
    size: "sm",
    pill: true,
    iconLeft: "radio-tower",
    onClick: onTuneIn
  }, "Escuchar en vivo"));
}
function Footer({
  logoTone = 'black'
}) {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      marginTop: 'var(--s-13)',
      padding: 'var(--s-11) var(--container-pad) var(--s-13)',
      boxShadow: 'inset 0 1px 0 var(--border-hairline)',
      display: 'grid',
      gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
      gap: 'var(--s-9)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    tone: logoTone,
    height: 20,
    base: "../../"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-mono)',
      textTransform: 'uppercase',
      color: 'var(--text-faint)',
      letterSpacing: 'var(--track-mono)'
    }
  }, "XHSON-FM \xB7 100.9 MHz \xB7 CDMX"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--s-3)'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "instagram",
    label: "Instagram",
    variant: "plain",
    size: "sm"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "youtube",
    label: "YouTube",
    variant: "plain",
    size: "sm"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "share-2",
    label: "Compartir",
    variant: "plain",
    size: "sm"
  }))), [['Radio', ['En vivo', 'Programación', 'Playlist', 'Podcasts']], ['Editorial', ['Beat News', 'Lanzamientos', 'Beat Ten', 'Beat Trends']], ['Estación', ['Nosotros', 'Publicidad', 'Contacto', 'Aviso de privacidad']]].map(([title, links]) => /*#__PURE__*/React.createElement("div", {
    key: title,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--s-5)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "beat-label",
    style: {
      color: 'var(--text-faint)'
    }
  }, title), links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-muted)'
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1',
      font: 'var(--type-mono)',
      fontSize: 10,
      color: 'var(--text-faint)',
      textTransform: 'uppercase',
      letterSpacing: '.08em',
      paddingTop: 'var(--s-7)'
    }
  }, "\xA9 2026 Beat 100.9 \xB7 NRM Comunicaciones \xB7 Prolongaci\xF3n Paseo de la Reforma 115, CDMX"));
}
function GenreFilter({
  value,
  onChange,
  items
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--s-3)',
      flexWrap: 'wrap'
    }
  }, items.map(g => /*#__PURE__*/React.createElement(Tag, {
    key: g,
    selected: g === value,
    onClick: () => onChange(g)
  }, g)));
}
function AppShell({
  route,
  onRoute,
  children,
  player,
  logoTone = 'black',
  headerBg
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100%',
      paddingBottom: 'var(--player-h)'
    }
  }, /*#__PURE__*/React.createElement(Header, {
    route: route,
    onRoute: onRoute,
    onTuneIn: player.onToggle,
    logoTone: logoTone,
    headerBg: headerBg
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      maxWidth: 'var(--grid-max)',
      margin: '0 auto',
      padding: '0 var(--container-pad)'
    }
  }, children), /*#__PURE__*/React.createElement(Footer, {
    logoTone: logoTone
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 'auto 0 0 0',
      zIndex: 'var(--z-player)'
    }
  }, /*#__PURE__*/React.createElement(NowPlayingBar, player)));
}
Object.assign(window, {
  AppShell,
  Header,
  Footer,
  GenreFilter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/ArticleScreen.jsx
try { (() => {
const {
  Badge,
  Tag,
  Button,
  IconButton,
  ArticleCard,
  SectionHeading,
  Icon
} = window.Beat1009DesignSystem_b52646;
function ArticleScreen({
  onRoute
}) {
  return /*#__PURE__*/React.createElement("article", {
    style: {
      paddingTop: 'var(--s-11)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--s-4)',
      font: 'var(--type-mono)',
      textTransform: 'uppercase',
      color: 'var(--text-faint)',
      marginBottom: 'var(--s-8)'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onRoute('Inicio');
    },
    style: {
      color: 'var(--text-faint)'
    }
  }, "Inicio"), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 12
  }), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: 'var(--text-faint)'
    }
  }, "Lanzamientos")), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 780
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: "accent"
  }, "Lanzamientos"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 'var(--size-h1)',
      fontFamily: 'var(--font-text)',
      fontVariationSettings: 'normal',
      letterSpacing: 'var(--track-heading)',
      lineHeight: 1.14,
      margin: 'var(--s-6) 0 var(--s-7)'
    }
  }, "Un Yamaha CS-80 atribuido a Vangelis rompe r\xE9cord y se convierte en el sintetizador m\xE1s caro de la historia"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--s-6)',
      alignItems: 'center',
      font: 'var(--type-mono)',
      textTransform: 'uppercase',
      color: 'var(--text-faint)',
      marginBottom: 'var(--s-9)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "10 ago 2026"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", null, "Redacci\xF3n Beat"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", null, "3 min"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--s-3)',
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "heart",
    label: "Guardar",
    variant: "plain",
    size: "sm"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "share-2",
    label: "Compartir",
    variant: "plain",
    size: "sm"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      aspectRatio: '16/9',
      borderRadius: 'var(--r-media)',
      background: 'var(--tex-grid), var(--surface-sunken)',
      backgroundSize: 'var(--tex-grid-size)',
      marginBottom: 'var(--s-6)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-mono)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--track-label)',
      color: 'var(--text-faint)'
    }
  }, "Foto de portada 16:9")), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-mono)',
      color: 'var(--text-faint)',
      textTransform: 'uppercase'
    }
  }, "Pie de foto \xB7 Cr\xE9dito del fot\xF3grafo"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 300px',
      gap: 'var(--s-13)',
      marginTop: 'var(--s-11)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 720
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body-lg)',
      color: 'var(--text-primary)'
    }
  }, "El instrumento apareci\xF3 a la venta en Reverb por un vendedor de Atenas y cerr\xF3 en 401,465 libras esterlinas, cifra que lo convierte en el sintetizador m\xE1s caro jam\xE1s vendido."), /*#__PURE__*/React.createElement("p", null, "El CS-80 es una de las m\xE1quinas m\xE1s reconocibles de la electr\xF3nica: polif\xF3nico, pesado, con control de expresi\xF3n por tecla. Su sonido est\xE1 en bandas sonoras completas y en discos que definieron el g\xE9nero."), /*#__PURE__*/React.createElement("blockquote", {
    style: {
      margin: 'var(--s-9) 0',
      padding: 'var(--s-7) var(--s-9)',
      borderLeft: '2px solid var(--surface-live)',
      background: 'var(--surface-card)',
      borderRadius: 'var(--r-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--w-semibold) var(--size-h3)/1.3 var(--font-text)',
      color: 'var(--text-primary)'
    }
  }, "\u201CNadie compra un CS-80 por conveniencia. Se compra por lo que hace cuando lo tocas.\u201D"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--s-5)',
      font: 'var(--type-mono)',
      textTransform: 'uppercase',
      color: 'var(--text-faint)'
    }
  }, "Coleccionista, v\xEDa Reverb")), /*#__PURE__*/React.createElement("p", null, "La subasta llega en un momento de precios al alza para sintetizadores anal\xF3gicos de los setenta y ochenta, empujado por la demanda de estudios y de coleccionistas privados."), /*#__PURE__*/React.createElement("p", null, "En M\xE9xico, el inter\xE9s por el hardware vintage creci\xF3 con los mercados de segunda mano y las ferias de audio; una unidad funcional del CS-80 no se hab\xEDa ofrecido localmente en m\xE1s de una d\xE9cada."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--s-3)',
      flexWrap: 'wrap',
      marginTop: 'var(--s-9)'
    }
  }, ['Vangelis', 'Yamaha', 'Sintetizadores', 'Subastas'].map(t => /*#__PURE__*/React.createElement(Tag, {
    key: t
  }, t)))), /*#__PURE__*/React.createElement("aside", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--s-8)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "beat-card",
    style: {
      padding: 'var(--pad-card)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "beat-label",
    style: {
      color: 'var(--text-live)'
    }
  }, "Al aire"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-h4)',
      color: 'var(--text-primary)',
      margin: 'var(--s-4) 0 2px'
    }
  }, "Matutino"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-muted)',
      marginBottom: 'var(--s-6)'
    }
  }, "Conducci\xF3n por definir \xB7 06:00 \u2014 10:00"), /*#__PURE__*/React.createElement(Button, {
    variant: "live",
    size: "sm",
    pill: true,
    block: true,
    iconLeft: "radio-tower"
  }, "Escuchar")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "beat-label",
    style: {
      color: 'var(--text-faint)'
    }
  }, "Te puede interesar"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--s-7)',
      marginTop: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement(ArticleCard, {
    category: "Gear",
    title: "V Series Five: la nueva l\xEDnea profesional de KRK",
    date: "08 ago 2026"
  }), /*#__PURE__*/React.createElement(ArticleCard, {
    category: "Beat News",
    title: "JME lanza una nueva versi\xF3n de \u201CBreak It Off\u201D",
    date: "09 ago 2026"
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--s-13)'
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    kicker: "Beat News",
    title: "M\xE1s de la escena",
    actionLabel: "Todas las notas"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 'var(--gap-grid)',
      marginTop: 'var(--s-9)'
    }
  }, /*#__PURE__*/React.createElement(ArticleCard, {
    category: "Beat Trends",
    title: "El regreso del trance mel\xF3dico a los festivales de CDMX",
    excerpt: "Line-ups que vuelven a abrir con 138 BPM.",
    date: "07 ago 2026"
  }), /*#__PURE__*/React.createElement(ArticleCard, {
    category: "Sesiones",
    title: "Sesiones 04: la sesi\xF3n completa en video",
    excerpt: "Una hora grabada en cabina, sin cortes.",
    date: "05 ago 2026"
  }), /*#__PURE__*/React.createElement(ArticleCard, {
    category: "Nerdosis",
    title: "C\xF3mo suena un CS-80 comparado con un Prophet-5",
    excerpt: "Dos filosof\xEDas de s\xEDntesis, lado a lado.",
    date: "03 ago 2026"
  }))));
}
Object.assign(window, {
  ArticleScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/ArticleScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/HomeScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  Button,
  Badge,
  LiveIndicator,
  SectionHeading,
  ShowCard,
  TrackRow,
  ArticleCard,
  Input,
  Icon
} = window.Beat1009DesignSystem_b52646;
const SHOWS = [{
  name: 'Matutino',
  host: 'Conducción por definir',
  schedule: '06:00 — 10:00',
  live: true
}, {
  name: 'BREAK',
  host: 'Sesión continua',
  schedule: '10:00 — 14:00',
  genre: 'House'
}, {
  name: 'Central',
  host: 'Conducción por definir',
  schedule: '14:00 — 16:00',
  genre: 'Techno'
}, {
  name: 'Lado F',
  host: 'Sesión en vivo',
  schedule: '18:00 — 20:00',
  genre: 'Progressive'
}];
const TEN = [{
  title: 'Fade Into You',
  artist: 'Kölsch',
  time: '6:12'
}, {
  title: 'Consciousness',
  artist: 'Mind Against',
  time: '7:20'
}, {
  title: 'Nightflow',
  artist: 'Adriatique',
  time: '8:02'
}, {
  title: 'Aurora',
  artist: 'Ben Böhmer',
  time: '5:48'
}, {
  title: 'Terminal',
  artist: 'Amelie Lens',
  time: '6:35'
}];
function Streaks() {
  const lines = [{
    top: '30%',
    left: '4%',
    right: '38%',
    soft: false
  }, {
    top: '34%',
    left: '10%',
    right: '22%',
    soft: true
  }, {
    top: '43%',
    left: '26%',
    right: '8%',
    soft: false
  }, {
    top: '52%',
    left: '46%',
    right: '2%',
    soft: true
  }, {
    top: '61%',
    left: '58%',
    right: '16%',
    soft: false
  }];
  return lines.map((l, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: `beat-streak ${l.soft ? 'is-soft' : ''}`,
    style: {
      top: l.top,
      left: l.left,
      right: l.right
    }
  }));
}
function Hero({
  onPlay,
  playing
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      margin: '0 calc(-1 * var(--container-pad)) var(--s-13)',
      padding: 'var(--s-13) var(--container-pad) var(--s-12)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(85% 110% at 74% 6%, rgba(255,255,255,.72), transparent 58%), radial-gradient(70% 90% at 8% 96%, rgba(255,196,154,.34), transparent 60%), linear-gradient(180deg, var(--mist-2), var(--mist-3))'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--tex-grid)',
      backgroundSize: 'var(--tex-grid-size)',
      opacity: .7,
      maskImage: 'linear-gradient(to bottom, #000, transparent)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      maxWidth: 'var(--grid-max)',
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1.15fr .85fr',
      gap: 'var(--s-11)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(LiveIndicator, {
    bars: true,
    label: "Al aire ahora \xB7 100.9 FM"
  }), /*#__PURE__*/React.createElement("h1", {
    className: "beat-display beat-glitch",
    style: {
      fontSize: 'var(--size-display-1)',
      fontWeight: 'var(--w-black)',
      margin: 'var(--s-6) 0 var(--s-5)',
      color: 'var(--text-primary)',
      lineHeight: 'var(--lh-display)'
    }
  }, "Matutino"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body-lg)',
      color: 'var(--text-muted)',
      maxWidth: 460,
      margin: '0 0 var(--s-8)'
    }
  }, "Conducci\xF3n en vivo, de 6 a 10. Electr\xF3nica, lo viral y humor para arrancar el d\xEDa."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--s-5)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "live",
    size: "lg",
    pill: true,
    iconLeft: playing ? 'pause' : 'play',
    onClick: onPlay
  }, playing ? 'Pausar transmisión' : 'Escuchar en vivo'), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    iconRight: "arrow-up-right"
  }, "Ver programaci\xF3n"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      aspectRatio: '4/5',
      borderRadius: 'var(--r-panel)',
      overflow: 'hidden',
      background: 'linear-gradient(165deg, var(--mist-2) 12%, var(--mist-4) 62%, var(--mist-5))',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Streaks, null), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      font: 'var(--type-mono)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--track-label)',
      color: 'var(--text-faint)',
      textAlign: 'center',
      lineHeight: 1.8,
      opacity: .75
    }
  }, "Retrato en movimiento", /*#__PURE__*/React.createElement("br", null), "4:5 \xB7 neblina + estelas"))));
}
function HomeScreen({
  onRoute,
  onPlay,
  playing
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Hero, {
    onPlay: onPlay,
    playing: playing
  }), /*#__PURE__*/React.createElement(SectionHeading, {
    kicker: "Programaci\xF3n",
    title: "Hoy al aire",
    actionLabel: "Ver todo",
    onAction: e => e.preventDefault()
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 'var(--gap-grid)',
      margin: 'var(--s-9) 0 var(--s-13)'
    }
  }, SHOWS.map(s => /*#__PURE__*/React.createElement(ShowCard, _extends({
    key: s.name
  }, s, {
    onPlay: onPlay
  })))), /*#__PURE__*/React.createElement(SectionHeading, {
    kicker: "Beat News",
    title: "Lo \xFAltimo de la escena",
    actionLabel: "Todas las notas"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr',
      gap: 'var(--s-11)',
      marginTop: 'var(--s-9)'
    }
  }, /*#__PURE__*/React.createElement(ArticleCard, {
    size: "lg",
    category: "Lanzamientos",
    title: "Un Yamaha CS-80 atribuido a Vangelis rompe el r\xE9cord de subasta",
    excerpt: "401,465 libras esterlinas por el sintetizador m\xE1s caro jam\xE1s vendido.",
    date: "10 ago 2026"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--s-8)'
    }
  }, [['Beat News', 'JME lanza una nueva versión de “Break It Off”', '09 ago 2026'], ['Gear', 'V Series Five: la nueva línea profesional de KRK', '08 ago 2026'], ['Beat Trends', 'El regreso del trance melódico a los festivales de CDMX', '07 ago 2026']].map(([cat, title, date]) => /*#__PURE__*/React.createElement("a", {
    key: title,
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      display: 'grid',
      gridTemplateColumns: '110px 1fr',
      gap: 'var(--s-6)',
      color: 'inherit',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: '4/3',
      borderRadius: 'var(--r-2)',
      background: 'var(--tex-grid), var(--surface-sunken)',
      backgroundSize: '16px 16px'
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "beat-article__cat"
  }, cat), /*#__PURE__*/React.createElement("div", {
    className: "beat-article__title",
    style: {
      marginTop: 6
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-mono)',
      color: 'var(--text-faint)',
      textTransform: 'uppercase'
    }
  }, date)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--s-11)',
      marginTop: 'var(--s-13)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionHeading, {
    kicker: "Beat Ten",
    title: "Top de la semana",
    actionLabel: "Ver lista",
    onAction: e => e.preventDefault()
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--s-6)'
    }
  }, TEN.map((t, i) => /*#__PURE__*/React.createElement(TrackRow, _extends({
    key: t.title,
    index: i + 1
  }, t, {
    playing: i === 0 && playing,
    onPlay: onPlay
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      borderRadius: 'var(--r-panel)',
      overflow: 'hidden',
      background: 'linear-gradient(160deg, var(--mist-1), var(--mist-4))',
      padding: 'var(--pad-card-lg)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      minHeight: 340
    }
  }, /*#__PURE__*/React.createElement(Streaks, null), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: "live"
  }, "Sesiones"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 'var(--s-6) 0 var(--s-5)',
      fontSize: 'var(--size-h2)'
    }
  }, "Sesiones 04"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-muted)',
      margin: '0 0 var(--s-7)',
      maxWidth: 380
    }
  }, "Una hora grabada en cabina, sin cortes. Ya disponible en video."), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    iconRight: "arrow-up-right"
  }, "Ver la sesi\xF3n")))), /*#__PURE__*/React.createElement("section", {
    className: "beat-card",
    style: {
      marginTop: 'var(--s-13)',
      padding: 'var(--pad-card-lg)',
      display: 'grid',
      gridTemplateColumns: '1fr 380px',
      gap: 'var(--s-11)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "beat-label",
    style: {
      color: 'var(--text-live)'
    }
  }, "Newsletter"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 'var(--s-5) 0 var(--s-4)',
      fontSize: 'var(--size-h2)'
    }
  }, "Lo que son\xF3, cada viernes"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-muted)',
      margin: 0
    }
  }, "Lanzamientos, sets y el Beat Ten de la semana. Sin spam. Solo m\xFAsica.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--s-4)',
      alignItems: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Correo",
    type: "email",
    placeholder: "tu@correo.com"
  })), /*#__PURE__*/React.createElement(Button, null, "Suscribirme"))));
}
Object.assign(window, {
  HomeScreen,
  Hero,
  Streaks
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/PlaylistScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  Tabs,
  Tag,
  Button,
  Badge,
  TrackRow,
  LiveIndicator,
  SectionHeading,
  Switch,
  Select
} = window.Beat1009DesignSystem_b52646;
const PLAYED = [{
  title: 'Strobe',
  artist: 'deadmau5',
  time: '06:41'
}, {
  title: 'Opus',
  artist: 'Eric Prydz',
  time: '06:33'
}, {
  title: 'Sunrise',
  artist: 'ARTBAT',
  time: '06:26'
}, {
  title: 'Innerbloom',
  artist: 'RÜFÜS DU SOL',
  time: '06:16'
}, {
  title: 'Language',
  artist: 'Porter Robinson',
  time: '06:09'
}, {
  title: 'Silent Shout',
  artist: 'The Knife',
  time: '06:02'
}];
const TOP = [{
  title: 'Fade Into You',
  artist: 'Kölsch',
  time: '6:12'
}, {
  title: 'Consciousness',
  artist: 'Mind Against',
  time: '7:20'
}, {
  title: 'Nightflow',
  artist: 'Adriatique',
  time: '8:02'
}, {
  title: 'Aurora',
  artist: 'Ben Böhmer',
  time: '5:48'
}, {
  title: 'Terminal',
  artist: 'Amelie Lens',
  time: '6:35'
}];
function PlaylistScreen({
  onPlay,
  playing
}) {
  const [view, setView] = React.useState('Playlist');
  const [genre, setGenre] = React.useState('Todos');
  const [autoplay, setAutoplay] = React.useState(true);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 'var(--s-11)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "beat-label",
    style: {
      color: 'var(--text-live)'
    }
  }, "Radio"), /*#__PURE__*/React.createElement("h1", {
    className: "beat-display",
    style: {
      fontSize: 'var(--size-display-3)',
      margin: 'var(--s-5) 0 var(--s-9)',
      color: 'var(--text-primary)'
    }
  }, "Playlist"), /*#__PURE__*/React.createElement(Tabs, {
    tabs: ['En vivo', 'Programación', 'Playlist', 'Podcasts'],
    value: view,
    onChange: setView
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '380px 1fr',
      gap: 'var(--s-11)',
      marginTop: 'var(--s-9)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "beat-card",
    style: {
      padding: 'var(--pad-card)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--s-7)',
      alignSelf: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: '1/1',
      borderRadius: 'var(--r-media)',
      background: 'var(--tex-grid), var(--surface-sunken)',
      backgroundSize: '28px 28px',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-mono)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--track-label)',
      color: 'var(--text-faint)'
    }
  }, "Portada 1:1")), /*#__PURE__*/React.createElement(LiveIndicator, {
    bars: true,
    label: "Suena ahora"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-h2)',
      fontFamily: 'var(--font-text)',
      letterSpacing: 'var(--track-heading)',
      color: 'var(--text-primary)'
    }
  }, "Strobe"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)'
    }
  }, "deadmau5"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-mono)',
      textTransform: 'uppercase',
      color: 'var(--text-faint)',
      marginTop: 'var(--s-4)'
    }
  }, "Matutino \xB7 06:41")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--s-4)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "live",
    pill: true,
    iconLeft: playing ? 'pause' : 'play',
    onClick: onPlay
  }, playing ? 'Pausar' : 'Reproducir'), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    iconLeft: "heart"
  }, "Guardar")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--s-5)',
      paddingTop: 'var(--s-6)',
      boxShadow: 'inset 0 1px 0 var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    label: "Autoplay al abrir",
    checked: autoplay,
    onChange: () => setAutoplay(!autoplay)
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Calidad del stream",
    options: ['Alta (256 kbps)', 'Estándar (128 kbps)', 'Ahorro de datos']
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 'var(--s-6)',
      flexWrap: 'wrap',
      marginBottom: 'var(--s-7)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--s-3)',
      flexWrap: 'wrap'
    }
  }, ['Todos', 'House', 'Techno', 'Trance', 'Progressive', 'Deep'].map(g => /*#__PURE__*/React.createElement(Tag, {
    key: g,
    selected: g === genre,
    onClick: () => setGenre(g)
  }, g))), /*#__PURE__*/React.createElement(Badge, {
    icon: "clock"
  }, "\xDAltimas 2 horas")), /*#__PURE__*/React.createElement(SectionHeading, {
    kicker: "Lo que son\xF3",
    title: "Historial"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: 'var(--s-6) 0 var(--s-11)'
    }
  }, PLAYED.map((t, i) => /*#__PURE__*/React.createElement(TrackRow, _extends({
    key: t.title,
    index: i + 1
  }, t, {
    playing: i === 0 && playing,
    onPlay: onPlay
  })))), /*#__PURE__*/React.createElement(SectionHeading, {
    kicker: "Beat Ten",
    title: "Top de la semana",
    actionLabel: "Lista completa"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--s-6)'
    }
  }, TOP.map((t, i) => /*#__PURE__*/React.createElement(TrackRow, _extends({
    key: t.title,
    index: i + 1
  }, t, {
    onPlay: onPlay
  })))))));
}
Object.assign(window, {
  PlaylistScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/PlaylistScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/ScheduleScreen.jsx
try { (() => {
const {
  Tabs,
  Badge,
  Button,
  IconButton,
  LiveIndicator,
  SectionHeading
} = window.Beat1009DesignSystem_b52646;
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const GRID = {
  Madrugada: [{
    time: '00:00 — 05:00',
    name: 'Beat en Penumbra',
    host: 'Sesión continua',
    genre: 'Deep · Techno'
  }, {
    time: '05:00 — 06:00',
    name: 'Lounge Beat',
    host: 'Selección Beat',
    genre: 'Chill · Lounge'
  }],
  Mañana: [{
    time: '06:00 — 10:00',
    name: 'Matutino',
    host: 'Conducción por definir',
    genre: 'Electrónica · Viral',
    live: true
  }, {
    time: '10:00 — 14:00',
    name: 'BREAK',
    host: 'Sesión continua',
    genre: 'House · Progressive'
  }],
  Tarde: [{
    time: '14:00 — 16:00',
    name: 'Central',
    host: 'Conducción por definir',
    genre: 'Techno'
  }, {
    time: '16:00 — 18:00',
    name: 'Beat Trends',
    host: 'Redacción Beat',
    genre: 'Novedades'
  }, {
    time: '18:00 — 20:00',
    name: 'Lado F',
    host: 'Sesión en vivo',
    genre: 'Progressive'
  }],
  Noche: [{
    time: '20:00 — 22:00',
    name: 'Beat Ten',
    host: 'Cuenta regresiva',
    genre: 'Top 10'
  }, {
    time: '22:00 — 00:00',
    name: 'Sesiones',
    host: 'Invitados',
    genre: 'Sets exclusivos'
  }]
};
function ScheduleRow({
  row,
  onPlay
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "beat-card is-interactive",
    style: {
      display: 'grid',
      gridTemplateColumns: '140px 76px minmax(200px,1.4fr) minmax(120px,1fr) 108px 36px',
      alignItems: 'center',
      gap: 'var(--s-7)',
      padding: 'var(--s-6) var(--pad-card)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-mono)',
      color: row.live ? 'var(--text-live)' : 'var(--text-muted)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--track-mono)'
    }
  }, row.time), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: 'var(--r-1)',
      background: 'var(--tex-grid), var(--surface-sunken)',
      backgroundSize: '14px 14px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-h4)',
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap'
    }
  }, row.name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-muted)'
    }
  }, row.host)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-faint)'
    }
  }, row.genre), /*#__PURE__*/React.createElement("div", null, row.live ? /*#__PURE__*/React.createElement(LiveIndicator, null) : /*#__PURE__*/React.createElement(Badge, null, "Programado")), /*#__PURE__*/React.createElement(IconButton, {
    icon: "play",
    label: `Reproducir ${row.name}`,
    variant: row.live ? 'live' : 'plain',
    size: "sm",
    onClick: onPlay
  }));
}
function ScheduleScreen({
  onPlay
}) {
  const [day, setDay] = React.useState('Lun');
  const [view, setView] = React.useState('Programación');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 'var(--s-11)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "beat-label",
    style: {
      color: 'var(--text-live)'
    }
  }, "Radio"), /*#__PURE__*/React.createElement("h1", {
    className: "beat-display",
    style: {
      fontSize: 'var(--size-display-3)',
      margin: 'var(--s-5) 0 var(--s-9)',
      color: 'var(--text-primary)'
    }
  }, "Programaci\xF3n"), /*#__PURE__*/React.createElement(Tabs, {
    tabs: ['En vivo', 'Programación', 'Playlist', 'Podcasts'],
    value: view,
    onChange: setView
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      margin: 'var(--s-8) 0 var(--s-9)'
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    variant: "pills",
    tabs: DAYS,
    value: day,
    onChange: setDay
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    iconLeft: "calendar"
  }, "Semana completa")), Object.entries(GRID).map(([block, rows]) => /*#__PURE__*/React.createElement("section", {
    key: block,
    style: {
      marginBottom: 'var(--s-11)'
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    kicker: block,
    title: `${rows.length} programas`
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--s-4)',
      marginTop: 'var(--s-6)'
    }
  }, rows.map(r => /*#__PURE__*/React.createElement(ScheduleRow, {
    key: r.name,
    row: r,
    onPlay: onPlay
  }))))));
}
Object.assign(window, {
  ScheduleScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/ScheduleScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.ArticleCard = __ds_scope.ArticleCard;

__ds_ns.LiveIndicator = __ds_scope.LiveIndicator;

__ds_ns.NowPlayingBar = __ds_scope.NowPlayingBar;

__ds_ns.SectionHeading = __ds_scope.SectionHeading;

__ds_ns.ShowCard = __ds_scope.ShowCard;

__ds_ns.TrackRow = __ds_scope.TrackRow;

})();
