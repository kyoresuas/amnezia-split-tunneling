(() => {
  "use strict";

  // Координаты репозитория
  const REPO = {
    owner: "kyoresuas",
    name: "ru-direct",
    branch: "release",
  };

  // Источники ссылок на файлы
  const SOURCES = {
    release: {
      title: "GitHub Releases",
      url: (file) =>
        `https://github.com/${REPO.owner}/${REPO.name}/releases/latest/download/${file}`,
    },
    cdn: {
      title: "jsDelivr CDN",
      url: (file) =>
        `https://cdn.jsdelivr.net/gh/${REPO.owner}/${REPO.name}@${REPO.branch}/${file}`,
    },
    raw: {
      title: "GitHub raw",
      url: (file) =>
        `https://raw.githubusercontent.com/${REPO.owner}/${REPO.name}/${REPO.branch}/${file}`,
    },
  };

  // Уровни списков, зеркало src/contracts/tiers
  const TIERS = [
    {
      id: "ru-lite",
      title: "Lite",
      description:
        "Банки, платежи, госуслуги и российские соцсети. Не более 500 подсетей, подходит любому клиенту",
      limit: 500,
      recommended: true,
    },
    {
      id: "ru-standard",
      title: "Standard",
      description:
        "Lite плюс маркетплейсы, Яндекс, Авито, 2ГИС, операторы, стриминги, доставка и ритейл. Не более 2000 подсетей",
      limit: 2000,
    },
    {
      id: "ru-full",
      title: "Full",
      description:
        "Standard плюс вся российская зона по данным RIPE. Тысячи подсетей, только для клиентов, которые стабильно держат большие таблицы маршрутов",
      limit: null,
    },
  ];

  // форматы
  const FORMATS = {
    amnezia: {
      title: "AmneziaVPN",
      file: (t) => `${t}.amnezia.json`,
      description: "Список подсетей для site-based split tunneling",
    },
    amneziaDomains: {
      title: "AmneziaVPN с доменами",
      file: (t) => `${t}.amnezia-domains.json`,
      description:
        "Те же подсети плюс домены с адресами. Десктопный клиент 5.x ре-резолвит домены при каждом подключении",
    },
    wireguard: {
      title: "AllowedIPs",
      file: (t) => `${t}.wireguard.txt`,
      description: "Через туннель идут только российские подсети",
    },
    wireguardInverted: {
      title: "AllowedIPs инвертированный",
      file: (t) => `${t}.wireguard-inverted.txt`,
      description:
        "Через туннель идёт весь интернет, кроме российских подсетей",
    },
    singboxSrs: {
      title: "sing-box rule-set",
      file: (t) => `${t}.singbox.srs`,
      description: "Бинарный rule-set для remote-подписки",
    },
    singboxJson: {
      title: "sing-box source",
      file: (t) => `${t}.singbox.json`,
      description: "Исходный JSON rule-set версии 1",
    },
    geoip: {
      title: "geoip.dat",
      file: () => "geoip.dat",
      description: "Теги ru-lite, ru-standard и ru-full внутри одного файла",
      shared: true,
    },
    geosite: {
      title: "geosite.dat",
      file: () => "geosite.dat",
      description: "Домены с тегами ru-lite и ru-standard",
      shared: true,
    },
    v2rayn: {
      title: "v2rayN правила",
      file: (t) => `${t}.v2rayn.json`,
      description:
        "Набор правил для импорта из буфера обмена в v2rayN и v2rayNG",
    },
    happ: {
      title: "Happ routing",
      file: (t) => `${t}.happ.json`,
      description: "Профиль маршрутизации Happ",
    },
    mihomoMrs: {
      title: "Mihomo .mrs",
      file: (t) => `${t}.mihomo.mrs`,
      description: "Бинарный rule-provider с behavior ipcidr",
    },
    mihomoYaml: {
      title: "Clash ipcidr",
      file: (t) => `${t}.mihomo.yaml`,
      description: "YAML rule-provider с behavior ipcidr",
    },
    clashClassical: {
      title: "Clash classical",
      file: (t) => `${t}.clash.yaml`,
      description: "IP-CIDR, IP-CIDR6 и DOMAIN-SUFFIX в одном провайдере",
    },
    surge: {
      title: "Rule-set",
      file: (t) => `${t}.surge.list`,
      description: "IP-CIDR, IP-CIDR6 и DOMAIN-SUFFIX",
    },
    quantumultx: {
      title: "Фильтр",
      file: (t) => `${t}.quantumultx.list`,
      description: "Правила с политикой direct для filter_remote",
    },
    mikrotik: {
      title: "MikroTik IPv4",
      file: (t) => `${t}.mikrotik.rsc`,
      description: "Скрипт .rsc с address-list",
    },
    mikrotikIpv6: {
      title: "MikroTik IPv6",
      file: (t) => `${t}.mikrotik-ipv6.rsc`,
      description: "Скрипт .rsc с ipv6 address-list",
    },
    keeneticBat: {
      title: "Маршруты .bat",
      file: (t) => `${t}.keenetic.bat`,
      description:
        "Импорт через веб-интерфейс, интерфейс выбирается при загрузке",
    },
    keeneticCli: {
      title: "Команды CLI",
      file: (t) => `${t}.keenetic-cli.txt`,
      description: "ip route для консоли KeeneticOS",
    },
    openwrtNft: {
      title: "nftables",
      file: (t) => `${t}.openwrt.nft`,
      description: "Наборы для fw4",
    },
    dnsmasq: {
      title: "dnsmasq nftset",
      file: (t) => `${t}.dnsmasq.conf`,
      description: "Доменная маршрутизация через dnsmasq-full",
    },
    windowsBat: {
      title: "Windows",
      file: (t) => `${t}.windows.bat`,
      description: "route add от администратора",
    },
    linuxSh: {
      title: "Linux",
      file: (t) => `${t}.linux.sh`,
      description: "ip -batch",
    },
    macosSh: {
      title: "macOS",
      file: (t) => `${t}.macos.sh`,
      description: "route add через sudo",
    },
    ipv4: {
      title: "IPv4 CIDR",
      file: (t) => `${t}.ipv4.txt`,
      description: "Подсети по строке",
    },
    ipv6: {
      title: "IPv6 CIDR",
      file: (t) => `${t}.ipv6.txt`,
      description: "Подсети по строке",
    },
    domains: {
      title: "Домены",
      file: (t) => `${t}.domains.txt`,
      description: "Домены по строке",
    },
  };

  // Клиенты
  const CLIENTS = [
    {
      id: "amnezia",
      title: "AmneziaVPN",
      formats: ["amnezia", "amneziaDomains"],
      steps: [
        "Скачайте файл на устройство.",
        "В AmneziaVPN откройте подключение, затем «Настройки подключения» и «Split Tunneling».",
        "Выберите «Site-based» и режим «Адреса из списка не идут через VPN».",
        "Нажмите меню, затем «Import» и «Replace site list», укажите файл.",
        "Включите split tunneling и переподключитесь.",
      ],
      note: "Файл с доменами имеет смысл только на десктопе: клиент 5.x ре-резолвит домены при каждом подключении. На телефоне берите обычный файл.",
    },
    {
      id: "wireguard",
      title: "AmneziaWG / WireGuard",
      formats: ["wireguard", "wireguardInverted"],
      steps: [
        "Откройте конфиг туннеля в редакторе.",
        "В секции [Peer] замените строку AllowedIPs строками из файла.",
        "Инвертированный файл нужен, когда весь интернет должен идти через VPN, а Россия напрямую. Обычный файл делает наоборот.",
        "Сохраните конфиг и переподключитесь.",
      ],
      note: "На iOS расширение сети падает примерно после 1000 маршрутов. Для WireGuard на iPhone берите Lite.",
    },
    {
      id: "singbox",
      title: "sing-box, Hiddify, NekoBox, Karing, Throne, Podkop",
      formats: ["singboxSrs", "singboxJson"],
      steps: [
        "Добавьте remote rule-set с URL на .srs в секцию route.rule_set.",
        "Добавьте правило, которое отправляет rule-set в outbound direct.",
        "Включите experimental.cache_file, чтобы rule-set переживал перезапуск.",
        "Podkop и Hiddify принимают URL на .srs в настройках маршрутов.",
      ],
      snippet: (tier, url) =>
        JSON.stringify(
          {
            route: {
              rules: [{ rule_set: [tier], outbound: "direct" }],
              rule_set: [
                {
                  type: "remote",
                  tag: tier,
                  format: "binary",
                  url,
                  update_interval: "1d",
                },
              ],
            },
            experimental: { cache_file: { enabled: true } },
          },
          null,
          2,
        ),
      snippetFormat: "singboxSrs",
    },
    {
      id: "xray",
      title: "Xray: v2rayN, v2rayNG, Happ, Streisand",
      formats: ["geoip", "geosite", "v2rayn", "happ"],
      steps: [
        "Положите geoip.dat и geosite.dat в каталог ресурсов ядра. В v2rayNG укажите репозиторий как источник geo-файлов: в релизе лежат файлы с нужными именами.",
        "В правилах маршрутизации используйте geoip:ru-lite и geosite:ru-lite, для других уровней ru-standard и ru-full.",
        "v2rayN и v2rayNG: файл правил импортируется через «Routing», «Import rules from clipboard».",
        "Happ: профиль маршрутизации импортируется из файла или через конструктор routing.happ.su.",
      ],
      snippet: (tier) =>
        JSON.stringify(
          {
            routing: {
              domainStrategy: "IPIfNonMatch",
              rules: [
                {
                  type: "field",
                  ip: [`geoip:${tier}`],
                  domain: [`geosite:${tier}`],
                  outboundTag: "direct",
                },
              ],
            },
          },
          null,
          2,
        ),
    },
    {
      id: "clash",
      title: "Clash, Mihomo, Clash Verge, FlClash",
      formats: ["mihomoMrs", "mihomoYaml", "clashClassical"],
      steps: [
        "Добавьте rule-provider с URL на файл. Mihomo понимает .mrs, классический Clash только YAML.",
        "Добавьте правило RULE-SET с политикой DIRECT и параметром no-resolve.",
        "Провайдер обновляется сам по interval.",
      ],
      snippet: (tier, url) =>
        [
          "rule-providers:",
          `  ${tier}:`,
          "    type: http",
          "    behavior: ipcidr",
          "    format: mrs",
          `    url: "${url}"`,
          `    path: ./ruleset/${tier}.mrs`,
          "    interval: 86400",
          "rules:",
          `  - RULE-SET,${tier},DIRECT,no-resolve`,
          "  - MATCH,PROXY",
        ].join("\n"),
      snippetFormat: "mihomoMrs",
    },
    {
      id: "surge",
      title: "Shadowrocket, Surge, Loon",
      formats: ["surge"],
      steps: [
        "Shadowrocket: «Config», «Edit», «Rules», плюс, тип RULE-SET, вставьте URL, политика DIRECT.",
        "Surge: добавьте строку RULE-SET в секцию [Rule].",
        "Loon: «Rules», «Rule Set», плюс, вставьте URL.",
      ],
      snippet: (tier, url) =>
        `RULE-SET,${url},DIRECT,no-resolve,update-interval=86400`,
      snippetFormat: "surge",
    },
    {
      id: "quantumultx",
      title: "Quantumult X",
      formats: ["quantumultx"],
      steps: [
        "«Settings», «Rules», «Filter remote», плюс, вставьте URL.",
        "Или добавьте строку в секцию [filter_remote] конфига.",
      ],
      snippet: (tier, url) =>
        `${url}, tag=${tier}, force-policy=direct, update-interval=86400, enabled=true`,
      snippetFormat: "quantumultx",
    },
    {
      id: "mikrotik",
      title: "MikroTik RouterOS",
      formats: ["mikrotik", "mikrotikIpv6"],
      steps: [
        "Скачайте скрипт на роутер командой /tool fetch.",
        "Импортируйте его: address-list пересоздаётся целиком.",
        "Добавьте mangle-правило: трафик к address-list идёт через основную таблицу, остальное через VPN. Повторяйте импорт по расписанию.",
      ],
      snippet: (tier, url, file) =>
        [
          `/tool fetch url="${url}" dst-path=${file}`,
          `/import file-name=${file}`,
          `/ip firewall mangle add chain=prerouting dst-address-list=${tier} action=mark-routing new-routing-mark=main passthrough=no comment="RU Direct"`,
        ].join("\n"),
      snippetFormat: "mikrotik",
    },
    {
      id: "keenetic",
      title: "Keenetic",
      formats: ["keeneticBat", "keeneticCli"],
      steps: [
        "Веб-интерфейс: «Маршрутизация», «Загрузить из файла», выберите .bat и интерфейс провайдера. Шлюз в файле не нужен.",
        "Консоль: вставьте команды из CLI-файла, заменив ISP на имя вашего интерфейса.",
        "Для Full файл большой: загружайте в несколько подходов или используйте Lite.",
      ],
    },
    {
      id: "openwrt",
      title: "OpenWrt",
      formats: ["openwrtNft", "dnsmasq"],
      steps: [
        "Примените набор: nft -f файл. Наборы ru_lite и ru_lite6 создаются в таблице inet fw4.",
        "Добавьте правило policy routing: трафик к набору помечается и идёт через основную таблицу.",
        "Файл dnsmasq положите в /etc/dnsmasq.d, нужен dnsmasq-full.",
      ],
      snippet: (tier, url, file) =>
        [`wget -O /tmp/${file} "${url}"`, `nft -f /tmp/${file}`].join("\n"),
      snippetFormat: "openwrtNft",
    },
    {
      id: "desktop",
      title: "Windows, Linux, macOS",
      formats: ["windowsBat", "linuxSh", "macosSh"],
      steps: [
        "Узнайте адрес шлюза провайдера: ipconfig, ip route или netstat -rn.",
        "Windows: запустите .bat от администратора и передайте шлюз аргументом.",
        "Linux и macOS: sh файл.sh <шлюз IPv4> [шлюз IPv6], на macOS через sudo.",
        "Маршруты живут до перезагрузки, добавьте скрипт в автозапуск.",
      ],
    },
    {
      id: "text",
      title: "Просто списки",
      formats: ["ipv4", "ipv6", "domains"],
      steps: [
        "Подсети и домены по строке без комментариев.",
        "Подходят для ipset, nftables loadfile, Podkop, keen-pbr и собственных скриптов.",
      ],
    },
  ];

  // Состояние страницы
  const state = {
    client: "amnezia",
    tier: "ru-lite",
    source: "cdn",
    manifest: null,
    manifestFailed: false,
  };

  const $ = (selector) => document.querySelector(selector);

  /**
   * Прочитать сохраненный выбор
   */
  const restore = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("ru-direct") || "{}");

      if (CLIENTS.some((c) => c.id === saved.client))
        state.client = saved.client;
      if (TIERS.some((t) => t.id === saved.tier)) state.tier = saved.tier;
      if (SOURCES[saved.source]) state.source = saved.source;
    } catch {
      //
    }
  };

  /**
   * Сохранить выбор
   */
  const persist = () => {
    try {
      localStorage.setItem(
        "ru-direct",
        JSON.stringify({
          client: state.client,
          tier: state.tier,
          source: state.source,
        }),
      );
    } catch {
      // Приватный режим или запрет хранения
    }
  };

  /**
   * Форматировать число по-русски
   */
  const num = (value) => new Intl.NumberFormat("ru-RU").format(value);

  /**
   * Размер файла в человекочитаемом виде
   */
  const size = (bytes) =>
    bytes >= 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} МБ`
      : `${Math.max(1, Math.round(bytes / 1024))} КБ`;

  /**
   * Сколько времени прошло с момента сборки
   */
  const ago = (iso) => {
    const hours = Math.max(
      0,
      Math.round((Date.now() - Date.parse(iso)) / 3600000),
    );

    if (hours < 1) return "только что";
    if (hours < 24) return `${hours} ч назад`;

    const days = Math.round(hours / 24);

    return `${days} ${days === 1 ? "день" : days < 5 ? "дня" : "дней"} назад`;
  };

  /**
   * Создать элемент с атрибутами и детьми
   */
  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
      if (key === "text") node.textContent = value;
      else if (key === "html") node.innerHTML = value;
      else if (value !== null && value !== undefined)
        node.setAttribute(key, value);
    }

    for (const child of children) {
      if (child) node.append(child);
    }

    return node;
  };

  /**
   * Иконка скачивания
   */
  const iconDownload = () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';

    return svg;
  };

  /**
   * Скопировать текст в буфер обмена с запасным вариантом
   */
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);

      return true;
    } catch {
      const area = el("textarea", { style: "position:fixed;opacity:0" });

      area.value = text;
      document.body.append(area);
      area.select();

      const ok = document.execCommand("copy");

      area.remove();

      return ok;
    }
  };

  /**
   * Кнопка «Копировать» с обратной связью
   */
  const copyButton = (label, getText) => {
    const button = el("button", {
      class: "btn",
      type: "button",
      text: label,
      "aria-live": "polite",
    });

    button.addEventListener("click", async () => {
      const ok = await copy(getText());

      button.textContent = ok ? "Скопировано" : "Не удалось";
      setTimeout(() => (button.textContent = label), 1600);
    });

    return button;
  };

  /**
   * Описание файла из манифеста по имени
   */
  const manifestFile = (name) => {
    if (!state.manifest) return null;

    const tier = state.manifest.tiers[state.tier];
    const files = [
      ...(tier ? tier.files : []),
      ...(state.manifest.shared || []),
    ];

    return files.find((f) => f.name === name) || null;
  };

  /**
   * Нарисовать чипы клиентов
   */
  const renderClients = () => {
    const box = $("#client-chips");

    box.replaceChildren();

    for (const client of CLIENTS) {
      const chip = el("button", {
        class: "chip",
        type: "button",
        text: client.title,
        "aria-pressed": String(client.id === state.client),
      });

      chip.addEventListener("click", () => {
        state.client = client.id;
        persist();
        renderClients();
        renderFiles();
      });
      box.append(chip);
    }
  };

  /**
   * Нарисовать карточки уровней
   */
  const renderTiers = () => {
    const box = $("#tier-cards");

    box.replaceChildren();

    for (const tier of TIERS) {
      const stats = state.manifest ? state.manifest.tiers[tier.id] : null;
      const dl = el("dl", { class: "stats" });
      const rows = [
        ["Подсетей IPv4", stats ? num(stats.ipv4) : null],
        ["Подсетей IPv6", stats ? num(stats.ipv6) : null],
        ["Доменов", stats ? num(stats.domains) : null],
        ["Сервисов", stats ? num(stats.services) : null],
      ];

      for (const [label, value] of rows) {
        dl.append(el("dt", { text: label }));
        dl.append(
          value !== null
            ? el("dd", { text: value })
            : state.manifestFailed
              ? el("dd", { text: "—" })
              : el("dd", { class: "skeleton", "aria-label": "загрузка" }),
        );
      }

      const meta = el("div", { class: "tier-meta" });

      if (stats) {
        meta.append(
          document.createTextNode(
            `Обновлено ${ago(state.manifest.generatedAt)}`,
          ),
        );

        if (stats.diff && (stats.diff.added || stats.diff.removed)) {
          meta.append(document.createTextNode(" · за сутки "));
          meta.append(
            el("span", { class: "diff-add", text: `+${stats.diff.added}` }),
          );
          meta.append(document.createTextNode(" / "));
          meta.append(
            el("span", { class: "diff-del", text: `−${stats.diff.removed}` }),
          );
        }
      } else {
        meta.textContent = tier.limit
          ? `Лимит ${num(tier.limit)} подсетей`
          : "Без лимита";
      }

      const card = el(
        "button",
        {
          class: "tier",
          type: "button",
          "aria-pressed": String(tier.id === state.tier),
        },
        [
          tier.recommended
            ? el("span", { class: "badge", text: "Рекомендуется" })
            : null,
          el("h3", { text: `${tier.id}` }),
          el("p", { text: tier.description }),
          dl,
          meta,
        ],
      );

      card.addEventListener("click", () => {
        state.tier = tier.id;
        persist();
        renderTiers();
        renderFiles();
      });
      box.append(card);
    }
  };

  /**
   * Переключатель источника ссылки
   */
  const sourceSelect = () => {
    const select = el("select", {
      name: "source",
      "aria-label": "Источник ссылки",
    });

    for (const [id, source] of Object.entries(SOURCES)) {
      const option = el("option", { value: id, text: source.title });

      if (id === state.source) option.selected = true;
      select.append(option);
    }

    select.addEventListener("change", () => {
      state.source = select.value;
      persist();
      renderFiles();
    });

    return el("label", { class: "source" }, [
      document.createTextNode("Ссылка для копирования:"),
      select,
    ]);
  };

  /**
   * Карточка одного файла
   */
  const fileCard = (client, formatId) => {
    const format = FORMATS[formatId];
    const name = format.file(state.tier);
    const download = SOURCES.release.url(name);
    const link = SOURCES[state.source].url(name);
    const info = manifestFile(name);
    const card = el("div", { class: "card" });

    card.append(el("h3", { text: format.title }));
    card.append(
      el("p", {
        class: "desc",
        text: format.shared
          ? `${format.description}. Файл общий для всех уровней`
          : format.description,
      }),
    );

    const actions = el("div", { class: "actions" });
    const button = el(
      "a",
      { class: "btn primary", href: download, download: name },
      [iconDownload(), document.createTextNode(`Скачать ${name}`)],
    );

    actions.append(button);
    actions.append(copyButton("Копировать ссылку", () => link));
    actions.append(sourceSelect());
    card.append(actions);

    const meta = el("div", { class: "file-meta" });

    if (info) {
      meta.append(el("span", { text: size(info.size) }));
      meta.append(
        el("span", {
          html: `SHA-256 <code>${info.sha256.slice(0, 16)}…</code>`,
        }),
      );
    } else if (state.manifest) {
      meta.append(el("span", { text: "Файла нет в последней сборке" }));
    }

    card.append(meta);
    card.append(el("code", { class: "url", text: link }));

    return card;
  };

  /**
   * Нарисовать блок файлов для выбранного клиента и уровня
   */
  const renderFiles = () => {
    const client = CLIENTS.find((c) => c.id === state.client) || CLIENTS[0];
    const box = $("#file-cards");

    $("#files-lead").textContent = `${client.title}, уровень ${state.tier}.`;
    box.replaceChildren();

    for (const formatId of client.formats)
      box.append(fileCard(client, formatId));

    const howto = el("div", { class: "card" });

    howto.append(el("h3", { text: "Как подключить" }));

    const steps = el("ol", { class: "steps" });

    for (const step of client.steps) steps.append(el("li", { text: step }));

    howto.append(steps);

    if (client.snippet) {
      const snippetFile = FORMATS[
        client.snippetFormat || client.formats[0]
      ].file(state.tier);
      const snippet = client.snippet(
        state.tier,
        SOURCES[state.source].url(snippetFile),
        snippetFile,
      );

      howto.append(el("pre", {}, [el("code", { text: snippet })]));
      howto.append(copyButton("Копировать сниппет", () => snippet));
    }

    if (client.note)
      howto.append(el("p", { class: "note", text: client.note }));

    box.append(howto);
  };

  /**
   * Загрузить манифест: CDN, потом raw
   */
  const loadManifest = async () => {
    const status = $("#manifest-status");

    for (const source of ["cdn", "raw"]) {
      try {
        const res = await fetch(SOURCES[source].url("manifest.json"), {
          cache: "no-cache",
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        state.manifest = await res.json();
        status.textContent = `Сборка от ${new Date(state.manifest.generatedAt).toLocaleString("ru-RU")}. Guard вычел ${num(state.manifest.guard.subtracted4)} чужих подсетей.`;
        renderTiers();
        renderFiles();

        return;
      } catch {
        // Пробуем следующий источник
      }
    }

    state.manifestFailed = true;
    status.textContent =
      "Статистика недоступна, ссылки на файлы всё равно работают.";
    renderTiers();
  };

  // Кэш списков подсетей для проверки адреса
  const ranges = new Map();

  /**
   * IPv4 в число
   */
  const ip4ToInt = (ip) => {
    const parts = ip.split(".");

    if (parts.length !== 4) return null;

    let value = 0;

    for (const part of parts) {
      if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return null;

      value = value * 256 + Number(part);
    }

    return value;
  };

  /**
   * Загрузить и разобрать подсети уровня
   */
  const loadRanges = async (tier) => {
    if (ranges.has(tier)) return ranges.get(tier);

    let text = null;

    for (const source of ["cdn", "raw"]) {
      try {
        const res = await fetch(SOURCES[source].url(`${tier}.ipv4.txt`));

        if (res.ok) {
          text = await res.text();
          break;
        }
      } catch {
        // Следующий источник
      }
    }

    if (text === null) throw new Error("Список недоступен");

    const list = [];

    for (const line of text.split("\n")) {
      const [ip, prefix] = line.trim().split("/");
      const start = ip ? ip4ToInt(ip) : null;

      if (start === null || prefix === undefined) continue;

      const sizeOfBlock = 2 ** (32 - Number(prefix));

      list.push({ start, end: start + sizeOfBlock - 1, cidr: line.trim() });
    }

    list.sort((a, b) => a.start - b.start);
    ranges.set(tier, list);

    return list;
  };

  /**
   * Найти подсеть, содержащую адрес
   */
  const findRange = (list, value) => {
    let low = 0;
    let high = list.length - 1;
    let found = null;

    while (low <= high) {
      const mid = (low + high) >> 1;

      if (list[mid].start <= value) {
        found = list[mid];
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return found && found.end >= value ? found.cidr : null;
  };

  /**
   * Зарезолвить домен через DNS-over-HTTPS
   */
  const resolveDomain = async (domain) => {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
      {
        headers: { accept: "application/dns-json" },
      },
    );

    if (!res.ok) throw new Error("DNS недоступен");

    const json = await res.json();

    return (json.Answer || []).filter((a) => a.type === 1).map((a) => a.data);
  };

  /**
   * Проверить один адрес по всем уровням
   */
  const checkIp = async (ip) => {
    const value = ip4ToInt(ip);
    const result = el("div", { class: "card" });
    const table = el("table");

    result.append(el("h3", { text: ip }));

    for (const tier of TIERS) {
      const list = await loadRanges(tier.id);
      const match = findRange(list, value);
      const row = el("tr");

      row.append(el("td", { text: tier.id }));
      row.append(
        match
          ? el("td", { class: "yes", text: `входит, ${match}` })
          : el("td", { class: "no", text: "не входит" }),
      );
      table.append(row);
    }

    result.append(table);

    return result;
  };

  /**
   * Обработать форму проверки
   */
  const onCheck = async (event) => {
    event.preventDefault();

    const input = $("#check-input")
      .value.trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0];
    const box = $("#check-result");

    box.replaceChildren(el("div", { class: "card", text: "Проверяю…" }));

    try {
      const ips =
        ip4ToInt(input) !== null ? [input] : await resolveDomain(input);

      if (ips.length === 0) throw new Error("Домен не резолвится");

      const cards = [];

      for (const ip of ips.slice(0, 8)) cards.push(await checkIp(ip));

      box.replaceChildren(...cards);
    } catch (err) {
      box.replaceChildren(
        el("div", {
          class: "card note warn",
          text: `Не получилось: ${err.message}`,
        }),
      );
    }
  };

  restore();
  renderClients();
  renderTiers();
  renderFiles();
  loadManifest();
  $("#check-form").addEventListener("submit", onCheck);
})();
