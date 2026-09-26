# RU Direct ru-lite: российские подсети напрямую, мимо VPN
# Обновлено: 2026-09-26T08:14:19.109Z
# https://github.com/kyoresuas/ru-direct
# Импорт: /import file-name=ru-lite.mikrotik-ipv6.rsc
/ipv6 firewall address-list
remove [find list="ru-lite"]
add list=ru-lite address=2001:67c:28bc::/48
add list=ru-lite address=2a00:1148::/29
add list=ru-lite address=2a00:46e0::/32
add list=ru-lite address=2a00:4c00:3::/48
add list=ru-lite address=2a00:b4c0::/32
add list=ru-lite address=2a00:bdc0::/33
add list=ru-lite address=2a00:bdc0:8000::/34
add list=ru-lite address=2a00:bdc0:c000::/35
add list=ru-lite address=2a00:bdc0:e002::/47
add list=ru-lite address=2a00:bdc0:e004::/47
add list=ru-lite address=2a00:bdc0:e007::/48
add list=ru-lite address=2a00:bdc0:f000::/36
add list=ru-lite address=2a00:bdc1::/32
add list=ru-lite address=2a00:bdc2::/31
add list=ru-lite address=2a00:bdc4::/30
add list=ru-lite address=2a02:6b8::1da/128
add list=ru-lite address=2a02:6b8::4fa/128
add list=ru-lite address=2a02:5180::/32
add list=ru-lite address=2a07:a600::/29
add list=ru-lite address=2a11:27c0::195/128
add list=ru-lite address=2a14:25c0::/32
add list=ru-lite address=2a14:25c5::/32
add list=ru-lite address=2a14:25c6::/31
