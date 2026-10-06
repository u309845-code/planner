# Шпаргалка по командам

Все команды вводятся в **PowerShell** (клавиша Windows → `PowerShell` → Enter). Вставка — правая кнопка мыши или Ctrl+V.

## Тестовая версия на своём компьютере
```
cd C:\Users\Julien\Desktop\Julien_planner-bot\web
npm.cmd run dev -- --host 127.0.0.1
```
Откройте http://127.0.0.1:5173. Остановить — **Ctrl+C**. Страница обновляется сама при сохранении файла.
Тестовая версия работает с той же базой, что и сайт: данные общие.

## Проверить, что код собирается
```
cd C:\Users\Julien\Desktop\Julien_planner-bot\web
npm.cmd run build
npm.cmd run lint
```

## Сохранить изменения (git)
```
cd C:\Users\Julien\Desktop\Julien_planner-bot
git status
git add -A
git commit -m "Что я изменила"
```
`git status` показывает, какие файлы изменены. Коммит сохраняет изменения только на компьютере.

## Выложить на сайт
```
git push
```
Через 1–2 минуты сайт обновится (вкладка **Actions** на GitHub покажет ход сборки).
Сайт: https://u309845-code.github.io/planner/

## Открыть проект в Cursor
Cursor → File → Open Folder → `C:\Users\Julien\Desktop\Julien_planner-bot`
Или из PowerShell, находясь в папке проекта: `cursor .`

## Если что-то не так
- «Выполнение сценариев отключено» — пишите `npm.cmd`, а не `npm`.
- Страница не открывается — проверьте, что окно PowerShell с сервером не закрыто, и откройте адрес `http://127.0.0.1:5173` (не `localhost`).
- Не обновилась база — в Supabase выполните новые файлы из папки `supabase\migrations` по порядку.

## Где читать про PowerShell
- В самом PowerShell: `Get-Help имя-команды` (например, `Get-Help Get-ChildItem`) и `Get-Help имя-команды -Examples`.
- Документация Microsoft на русском: https://learn.microsoft.com/ru-ru/powershell/
- Git: https://git-scm.com/book/ru/v2
