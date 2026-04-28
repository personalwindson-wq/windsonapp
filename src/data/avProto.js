// Protocolos corretivos por desvio postural.
// Cada chave corresponde a uma métrica calculada por avCalcM().
const AV_PROTO = {
  forwardHead: {label:'Anteriorização Cervical + Cifose Torácica',
    mild:[
      {n:'Retração Cervical (Chin Tuck)',d:'4 × 10 reps — manter 3s, cotovelos atrás da linha do corpo'},
      {n:'Mobilização Torácica com Foam Roller',d:'3 × 60s — extensão sobre o rolo em T4–T8'},
      {n:'Rotação Torácica em Decúbito Lateral',d:'3 × 10 reps por lado'},
      {n:'Alongamento Escalenos',d:'3 × 30s por lado'},
      {n:'Shoulder Y-T-W (ativação de trapézio inf.)',d:'3 × 10 reps de cada — sem compensação lombar'},
    ],
    moderate:[
      {n:'Retração Cervical (Chin Tuck)',d:'4 × 15 reps — manter 5s ⭐ PRIORIDADE'},
      {n:'Mobilização Torácica com Foam Roller',d:'3 × 90s — extensão segmentada T4 a T8'},
      {n:'Lib. Miofascial Esternocleidomastoideo',d:'3 × 60s por lado'},
      {n:'Fortalecimento Trapézio Inferior + Médio',d:'4 × 15 reps — prone Y-T-W'},
      {n:'Alongamento Peitoral na Porta (90°)',d:'3 × 45s — sem compensação lombar'},
      {n:'Remada Curvada com Retração Escapular',d:'3 × 12 reps — carga leve, foco em depressão escapular'},
    ],
    ci:['Desenvolvimento Halteres com cabeça projetada','Remada em pé com barra (compressão cervical)','Supino reto com grau elevado de cifose (sem correção torácica primeiro)']},

  shoulderAsymmetry: {label:'Assimetria de Ombros',
    mild:[{n:'Squeeze Escapular Bilateral',d:'3 × 15 reps'},{n:'Rotação Externa com Elástico',d:'3 × 12 reps por lado'}],
    moderate:[{n:'Retração e Depressão Escapular Isolada',d:'4 × 12 reps'},{n:'Shoulder Y-T-W',d:'3 × 10 reps de cada'},{n:'Alongamento Trapézio Superior (lado alto)',d:'3 × 30s'}],
    ci:['Exercícios unilaterais priorizando lado assimétrico','Desenvolvimento Militar com carga alta (4–6 semanas)']},

  hipSymmetry: {label:'Báscula Pélvica / Assimetria Quadril',
    mild:[{n:'Ponte Glútea Bilateral',d:'3 × 15 reps'},{n:'Alongamento Iliopsoas',d:'3 × 30s por lado'}],
    moderate:[{n:'Ponte Glútea Unilateral',d:'3 × 12 reps por lado'},{n:'Hip Hinge com neutralidade pélvica',d:'3 × 10 reps'},{n:'Lib. Miofascial Iliopsoas',d:'3 × 60s por lado'},{n:'Clam Shell com Elástico',d:'3 × 15 reps por lado'}],
    ci:['Agachamento livre com carga (4 semanas de correção primeiro)','Levantamento Terra sem confirmação de neutralidade lombar']},

  trunkInclination: {label:'Inclinação / Desvio de Tronco',
    mild:[{n:'Prancha Isométrica',d:'3 × 30s'},{n:'Bird-Dog',d:'3 × 10 reps por lado'}],
    moderate:[{n:'Pallof Press (Anti-rotação)',d:'3 × 12 reps por lado'},{n:'Prancha Lateral',d:'3 × 20s por lado'},{n:'Dead Bug',d:'3 × 8 reps por lado'}],
    ci:['Cargas axiais pesadas (Agachamento/Terra) até reavaliação','Exercícios que acentuem rotação assimétrica de tronco']},

  headTilt: {label:'Inclinação Lateral de Cabeça',
    mild:[{n:'Inclinação Lateral Cervical Ativa-Assistida',d:'3 × 10 reps por lado'},{n:'Estabilização Cervical em Neutro',d:'3 × 12 reps — manter 3s'}],
    moderate:[{n:'Lib. Miofascial Trapézio Superior (lado inclinado)',d:'3 × 60s'},{n:'Estabilização Cervical Isométrica em Neutro',d:'4 × 15 reps — manter 3s'},{n:'Retroflexão Suave com Tração Occipital',d:'3 × 30s'}],
    ci:['Exercícios com rotação cervical + carga','Desenvolvimento com barra (tensão cervical assimétrica)']},

  anteriorPelvicTilt: {label:'Anteversão Pélvica / Hiperlordose Lombar',
    mild:[
      {n:'Retroversão Pélvica em Decúbito (Pelvic Tilt)',d:'3 × 15 reps — pressionar lombar no chão, manter 3s'},
      {n:'Ponte Glútea Bilateral',d:'3 × 15 reps — squeeze glúteo no topo por 2s'},
      {n:'Alongamento Iliopsoas (Afundo Estático)',d:'3 × 40s por lado — pelve neutra'},
      {n:'Dead Bug',d:'3 × 8 reps por lado — manter lombar colada ao chão'},
      {n:'Prancha Isométrica',d:'3 × 30s — foco em retroversão pélvica'},
    ],
    moderate:[
      {n:'Retroversão Pélvica + Hollowing Abdominal',d:'4 × 15 reps ⭐ PRIORIDADE — ativação do transverso'},
      {n:'Ponte Glútea Unilateral',d:'4 × 12 reps por lado — máxima ativação glútea'},
      {n:'Alongamento Iliopsoas com Resistência',d:'3 × 60s por lado — progressão com elástico'},
      {n:'Dead Bug com Resistência',d:'3 × 10 reps por lado — braço oposto à perna'},
      {n:'Bird-Dog',d:'3 × 12 reps por lado — coluna neutra, sem rotação de pelve'},
      {n:'Hip Hinge com Bastão (Padrão de Dobradiça)',d:'3 × 15 reps — reaprender padrão motor'},
      {n:'Agachamento Goblet (Neutro)',d:'3 × 10 reps — carga leve, foco postural'},
    ],
    ci:[
      'Levantamento Terra com hiperlordose — risco de lesão discal lombar',
      'Abdominais tradicionais (sit-up/crunch) — aumentam tensão no iliopsoas',
      'Agachamento livre profundo sem neutralidade lombar confirmada',
      'Extensão lombar na máquina (hiperextensão) — acentua a lordose',
    ]}
};
window.AV_PROTO = AV_PROTO;
