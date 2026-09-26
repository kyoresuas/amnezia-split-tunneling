export interface IZoneSource {
  // Имя зоны
  name: string;
  // URL файла с подсетями по строке
  url: string;
  // Семейство адресов
  family: 4 | 6;
  // Без этой зоны сборка невозможна
  required: boolean;
}
