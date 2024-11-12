# ![Rusbé Scraper](/assets/logo.svg)
Ferramenta de raspagem de dados do Restaurante Universitário da UFPE.

![Build status](https://github.com/Erick2280/rusbe-scraper/workflows/build/badge.svg)

## Como funciona

Este script realiza a raspagem (scraping) do cardápio na [página oficial do Restaurante Universitário da UFPE](https://www.ufpe.br/restaurante), convertendo as informações para formato JSON, para que o web app do Rusbé possa utilizá-las.

Uma workflow do Github Actions executa periodicamente o script, salvando os dados do cardápio na _branch_ `archive` deste repositório. Você também pode acessar os arquivos JSON obtidos por raspagem em [archive.rusbe.riso.dev](https://archive.rusbe.riso.dev).

## Executando localmente

Este projeto precisa da última versão do Deno instalada em sua máquina.

Para executar o script, execute no terminal o seguinte:

``` sh

    deno task start

```

O script se conectará à página do Restaurante Universitário, e caso haja dados novos, atualizará os arquivos JSON na pasta `/dist/days`.

Caso deseje que o script reinicie automaticamente em caso de alteração no código-fonte, execute no terminal o seguinte:

``` sh

    deno task dev

```
