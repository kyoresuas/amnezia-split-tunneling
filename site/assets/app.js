(() => {
  "use strict";

  // Координаты репозитория
  const REPO = "kyoresuas/ru-direct";

  /**
   * Ссылка на файл последнего релиза, без кэша
   */
  const releaseUrl = (file) =>
    `https://github.com/${REPO}/releases/latest/download/${file}`;

  /**
   * Ссылка через CDN для подписок в клиентах
   */
  const cdnUrl = (file) =>
    `https://cdn.jsdelivr.net/gh/${REPO}@release/${file}`;

  // Уровни списков, зеркало src/contracts/tiers
  const TIERS = [
    {
      id: "ru-lite",
      title: "Lite",
      limit: 500,
      hint: "Банки, платежи, госуслуги и соцсети. Подходит любому клиенту",
    },
    {
      id: "ru-standard",
      title: "Standard",
      limit: 2000,
      hint: "Плюс Ozon, Wildberries, Яндекс, Авито, операторы и стриминги",
    },
    {
      id: "ru-full",
      title: "Full",
      limit: null,
      hint: "Вся российская зона. Только для роутеров и десктопов",
    },
  ];

  // Клиенты
  const CLIENTS = [
    {
      id: "amnezia",
      title: "AmneziaVPN",
      apps: "Android, iOS, Windows, macOS",
      file: (t) => `${t}.amnezia.json`,
      extra: [
        {
          title: "с доменами для десктопа",
          file: (t) => `${t}.amnezia-domains.json`,
        },
      ],
      steps: [
        "Скачайте файл на устройство",
        "Подключение → Настройки подключения → Split Tunneling → Site-based",
        "Режим «Адреса из списка не идут через VPN»",
        "⋮ → Import → Replace site list, выберите файл и переподключитесь",
      ],
    },
    {
      id: "wireguard",
      title: "WireGuard",
      apps: "AmneziaWG, WireGuard",
      file: (t) => `${t}.wireguard-inverted.txt`,
      extra: [
        {
          title: "только Россия через туннель",
          file: (t) => `${t}.wireguard.txt`,
        },
      ],
      steps: [
        "Откройте конфиг туннеля",
        "В секции [Peer] замените AllowedIPs строками из файла",
        "Сохраните и переподключитесь",
      ],
    },
    {
      id: "singbox",
      title: "sing-box",
      apps: "Hiddify, NekoBox, Karing, Podkop",
      file: (t) => `${t}.singbox.srs`,
      extra: [{ title: "source JSON", file: (t) => `${t}.singbox.json` }],
      steps: ["Добавьте remote rule-set с этой ссылкой и правило direct"],
      snippet: (t, url) =>
        [
          "{",
          '  "route": {',
          `    "rules": [{ "rule_set": ["${t}"], "outbound": "direct" }],`,
          `    "rule_set": [{ "type": "remote", "tag": "${t}", "format": "binary", "url": "${url}" }]`,
          "  }",
          "}",
        ].join("\n"),
    },
    {
      id: "xray",
      title: "Xray",
      apps: "v2rayN, v2rayNG, Happ, Streisand",
      file: () => "geoip.dat",
      extra: [
        { title: "geosite.dat", file: () => "geosite.dat" },
        { title: "правила v2rayN", file: (t) => `${t}.v2rayn.json` },
        { title: "профиль Happ", file: (t) => `${t}.happ.json` },
      ],
      steps: [
        "Положите geoip.dat и geosite.dat в каталог ресурсов клиента",
        "В правилах маршрутизации используйте теги ниже с outbound direct",
      ],
      snippet: (t) => `geoip:${t}\ngeosite:${t}`,
    },
    {
      id: "clash",
      title: "Clash",
      apps: "Mihomo, Clash Verge, FlClash",
      file: (t) => `${t}.mihomo.mrs`,
      extra: [
        { title: "YAML ipcidr", file: (t) => `${t}.mihomo.yaml` },
        { title: "YAML classical", file: (t) => `${t}.clash.yaml` },
      ],
      steps: ["Добавьте rule-provider и правило RULE-SET с политикой DIRECT"],
      snippet: (t, url) =>
        [
          "rule-providers:",
          `  ${t}:`,
          "    type: http",
          "    behavior: ipcidr",
          "    format: mrs",
          `    url: "${url}"`,
          "    interval: 86400",
          "rules:",
          `  - RULE-SET,${t},DIRECT,no-resolve`,
        ].join("\n"),
    },
    {
      id: "surge",
      title: "Shadowrocket",
      apps: "Surge, Loon",
      file: (t) => `${t}.surge.list`,
      steps: ["Rules → + → RULE-SET, вставьте ссылку, политика DIRECT"],
      snippet: (_, url) => `RULE-SET,${url},DIRECT,no-resolve`,
    },
    {
      id: "quantumultx",
      title: "Quantumult X",
      apps: "iOS",
      file: (t) => `${t}.quantumultx.list`,
      steps: ["Settings → Rules → Filter remote → +, вставьте ссылку"],
    },
    {
      id: "mikrotik",
      title: "MikroTik",
      apps: "RouterOS",
      file: (t) => `${t}.mikrotik.rsc`,
      extra: [{ title: "IPv6", file: (t) => `${t}.mikrotik-ipv6.rsc` }],
      steps: [
        "Скачайте скрипт на роутер и импортируйте, address-list пересоздаётся",
      ],
      snippet: (t, url) =>
        `/tool fetch url="${url}" dst-path=${t}.mikrotik.rsc\n/import file-name=${t}.mikrotik.rsc`,
    },
    {
      id: "keenetic",
      title: "Keenetic",
      apps: "KeeneticOS",
      file: (t) => `${t}.keenetic.bat`,
      extra: [{ title: "команды CLI", file: (t) => `${t}.keenetic-cli.txt` }],
      steps: [
        "Маршрутизация → Загрузить из файла, выберите файл и интерфейс провайдера",
      ],
    },
    {
      id: "openwrt",
      title: "OpenWrt",
      apps: "fw4, dnsmasq",
      file: (t) => `${t}.openwrt.nft`,
      extra: [{ title: "dnsmasq nftset", file: (t) => `${t}.dnsmasq.conf` }],
      steps: [
        "Примените набор командой ниже, затем добавьте правило policy routing",
      ],
      snippet: (t, url) =>
        `wget -O /tmp/${t}.nft "${url}"\nnft -f /tmp/${t}.nft`,
    },
    {
      id: "desktop",
      title: "Windows / Linux / macOS",
      apps: "route add",
      file: (t) => `${t}.windows.bat`,
      extra: [
        { title: "Linux", file: (t) => `${t}.linux.sh` },
        { title: "macOS", file: (t) => `${t}.macos.sh` },
      ],
      steps: [
        "Запустите от администратора и передайте шлюз провайдера аргументом",
      ],
    },
    {
      id: "text",
      title: "Просто списки",
      apps: "ipset, скрипты",
      file: (t) => `${t}.ipv4.txt`,
      extra: [
        { title: "IPv6", file: (t) => `${t}.ipv6.txt` },
        { title: "домены", file: (t) => `${t}.domains.txt` },
      ],
      steps: ["Подсети по строке без комментариев"],
    },
  ];

  // Выбор пользователя
  const state = { client: "amnezia", tier: "ru-lite", manifest: null };

  const $ = (selector) => document.querySelector(selector);

  /**
   * Восстановить выбор из прошлого визита
   */
  const restore = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("ru-direct") || "{}");

      if (CLIENTS.some((c) => c.id === saved.client))
        state.client = saved.client;
      if (TIERS.some((t) => t.id === saved.tier)) state.tier = saved.tier;
    } catch {
      //
    }
  };

  /**
   * Запомнить выбор
   */
  const persist = () => {
    try {
      localStorage.setItem(
        "ru-direct",
        JSON.stringify({ client: state.client, tier: state.tier }),
      );
    } catch {
      //
    }
  };

  /**
   * Создать элемент с атрибутами и детьми
   */
  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
      if (key === "text") node.textContent = value;
      else if (value !== null && value !== undefined)
        node.setAttribute(key, value);
    }

    for (const child of children) if (child) node.append(child);

    return node;
  };

  /**
   * Скопировать текст с обратной связью на кнопке
   */
  const copyButton = (label, getText, className = "btn") => {
    const button = el("button", {
      class: className,
      type: "button",
      text: label,
    });

    button.addEventListener("click", async () => {
      let ok = true;

      try {
        await navigator.clipboard.writeText(getText());
      } catch {
        ok = false;
      }

      button.textContent = ok ? "Скопировано" : "Не удалось";
      setTimeout(() => (button.textContent = label), 1500);
    });

    return button;
  };

  /**
   * Нарисовать группу радиокнопок
   */
  const renderGroup = (box, items, current, className, render, onPick) => {
    box.replaceChildren();

    for (const item of items) {
      const button = el("button", {
        class: className,
        type: "button",
        role: "radio",
        "aria-checked": String(item.id === current),
      });

      render(button, item);
      button.addEventListener("click", () => onPick(item.id));
      box.append(button);
    }
  };

  /**
   * Число подсетей уровня из манифеста или лимит
   */
  const tierCount = (tier) => {
    const stats = state.manifest?.tiers?.[tier.id];

    if (stats)
      return `${new Intl.NumberFormat("ru-RU").format(stats.ipv4)} подсетей`;

    return tier.limit ? `до ${tier.limit} подсетей` : "тысячи подсетей";
  };

  /**
   * Перерисовать всю страницу
   */
  const render = () => {
    const client = CLIENTS.find((c) => c.id === state.client) || CLIENTS[0];
    const tier = TIERS.find((t) => t.id === state.tier) || TIERS[0];

    renderGroup(
      $("#clients"),
      CLIENTS,
      client.id,
      "option",
      (button, item) => {
        button.append(
          document.createTextNode(item.title),
          el("small", { text: item.apps }),
        );
      },
      (id) => {
        state.client = id;
        persist();
        render();
      },
    );

    renderGroup(
      $("#tiers"),
      TIERS,
      tier.id,
      "segment",
      (button, item) => {
        button.append(
          document.createTextNode(item.title),
          el("span", { text: tierCount(item) }),
        );
      },
      (id) => {
        state.tier = id;
        persist();
        render();
      },
    );

    $("#tier-hint").textContent = tier.hint;

    const file = client.file(tier.id);
    const link = cdnUrl(file);
    const result = $("#result");
    const actions = el("div", { class: "actions" }, [
      el("a", {
        class: "btn primary",
        href: releaseUrl(file),
        download: file,
        text: `Скачать ${file}`,
      }),
      copyButton("Копировать ссылку", () => link),
    ]);

    result.replaceChildren(actions);

    if (client.extra?.length) {
      const extra = el("p", { class: "extra" }, [
        document.createTextNode("Ещё: "),
      ]);

      for (const item of client.extra) {
        extra.append(
          el("a", {
            href: releaseUrl(item.file(tier.id)),
            download: item.file(tier.id),
            text: item.title,
          }),
        );
      }

      result.append(extra);
    }

    result.append(
      client.steps.length > 1
        ? el(
            "ol",
            { class: "steps" },
            client.steps.map((step) => el("li", { text: step })),
          )
        : el("p", { class: "steps single", text: client.steps[0] }),
    );

    if (client.snippet) {
      const snippet = client.snippet(tier.id, link);

      result.append(
        el("pre", {}, [el("code", { text: snippet })]),
        copyButton("Копировать", () => snippet, "btn snippet-copy"),
      );
    }
  };

  /**
   * Подгрузить манифест, чтобы показать точные числа
   */
  const loadManifest = async () => {
    try {
      const res = await fetch(cdnUrl("manifest.json"), { cache: "no-cache" });

      if (!res.ok) return;

      state.manifest = await res.json();
      render();
    } catch {
      //
    }
  };

  restore();
  render();
  loadManifest();
})();
