# Referências do catálogo Office para branding PDF

As opções de tipografia e cor do editor serão tratadas como um catálogo compatível com temas Office, sem redistribuir ficheiros de fontes proprietárias no projecto.

1. Microsoft Support, “New Office theme”: https://support.microsoft.com/en-us/office/foundations-experiences/new-office-theme
   - A página indica que Aptos é a fonte predefinida actual do Office e que o novo tema inclui uma paleta de cores padrão actualizada.
2. Microsoft Learn, “Aptos font family”: https://learn.microsoft.com/en-us/typography/font-list/aptos
   - A família Aptos inclui variantes normal, bold, italic, Display, Narrow, Mono e Serif, entre outras, e tem informação própria de licenciamento/redistribuição.
3. Microsoft Support, “Change a theme and make it the default in Word or Excel”: https://support.microsoft.com/en-us/office/foundations-experiences/change-a-theme-and-make-it-the-default-in-word-or-excel
   - Os temas Office coordenam fontes e cores; as cores incluem categorias de tema como Accent 1–6, Dark/Light e Hyperlink, além de cores standard e personalizadas.

Decisão de implementação: disponibilizar no editor uma lista Office-compatible de famílias comuns e uma paleta de cores de tema (escuro/claro, Accent 1–6, hyperlinks e cores standard). O PDFKit apenas tem fontes base incorporadas; famílias seleccionadas serão mapeadas de forma determinística para Helvetica, Times-Roman ou Courier no PDF, enquanto a pré-visualização mantém a família CSS escolhida.
