// Владелец репозитория на GitHub
const OWNER = "kyoresuas";

// Имя репозитория на GitHub
const NAME = "ru-direct";

/**
 * Координаты проекта. При переименовании репозитория менять только здесь
 */
export const RepositoryContract = {
  OWNER,
  NAME,
  // Название проекта для людей
  TITLE: "RU Direct",
  // Адрес репозитория
  URL: `https://github.com/${OWNER}/${NAME}`,
  // Сайт со списками
  SITE_URL: `https://${OWNER}.github.io/${NAME}/`,
  // Тег rolling-релиза
  RELEASE_TAG: "latest",
  // Ветка с готовыми файлами для jsDelivr и raw
  RELEASE_BRANCH: "release",
  // Стабильная ссылка на файл последнего релиза
  releaseUrl: (file: string): string =>
    `https://github.com/${OWNER}/${NAME}/releases/latest/download/${file}`,
  // Ссылка через CDN jsDelivr
  cdnUrl: (file: string): string =>
    `https://cdn.jsdelivr.net/gh/${OWNER}/${NAME}@release/${file}`,
  // Ссылка на raw-файл ветки release
  rawUrl: (file: string): string =>
    `https://raw.githubusercontent.com/${OWNER}/${NAME}/release/${file}`,
} as const;
