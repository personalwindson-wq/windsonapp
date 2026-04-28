// Conexões do esqueleto MoveNet usadas para desenhar o wireframe corporal.
const AV_CONNS = [
  ['nose','left_eye'],['nose','right_eye'],['left_eye','left_ear'],['right_eye','right_ear'],
  ['left_shoulder','right_shoulder'],['left_shoulder','left_elbow'],['right_shoulder','right_elbow'],
  ['left_elbow','left_wrist'],['right_elbow','right_wrist'],
  ['left_shoulder','left_hip'],['right_shoulder','right_hip'],['left_hip','right_hip'],
  ['left_hip','left_knee'],['right_hip','right_knee'],['left_knee','left_ankle'],['right_knee','right_ankle'],
];

// Mapeamento PT → EN para busca na ExerciseDB (RapidAPI).
const EX_EN_MAP = {
  'Retração Cervical':                        'chin tuck',
  'Mobilização Torácica':                     'thoracic extension',
  'Rotação Torácica':                         'torso rotation',
  'Alongamento Escalenos':                    'neck stretch',
  'Shoulder Y-T-W':                           'prone y raise',
  'Lib. Miofascial Esternocleidomastoideo':   'neck lateral stretch',
  'Fortalecimento Trapézio Inferior':         'prone y raise',
  'Fortalecimento Trapézio':                  'face pull',
  'Alongamento Peitoral':                     'chest stretch',
  'Remada Curvada':                           'bent over row',
  'Squeeze Escapular':                        'face pull',
  'Rotação Externa com Elástico':             'band external rotation',
  'Retração e Depressão Escapular':           'scapular retraction',
  'Retração Escapular':                       'scapular retraction',
  'Ponte Glútea Bilateral':                   'glute bridge',
  'Ponte Glútea Unilateral':                  'single leg glute bridge',
  'Ponte Glútea':                             'glute bridge',
  'Alongamento Iliopsoas':                    'hip flexor stretch',
  'Hip Hinge com Bastão':                     'romanian deadlift',
  'Hip Hinge':                                'romanian deadlift',
  'Clam Shell':                               'clamshell',
  'Prancha Isométrica':                       'plank',
  'Prancha Lateral':                          'side plank',
  'Bird-Dog':                                 'bird dog',
  'Dead Bug':                                 'dead bug',
  'Pallof Press':                             'pallof press',
  'Retroversão Pélvica + Hollowing Abdominal':'pelvic tilt',
  'Retroversão Pélvica':                      'pelvic tilt',
  'Agachamento Goblet':                       'goblet squat',
  'Inclinação Lateral Cervical':              'neck lateral flexion',
  'Estabilização Cervical em Neutro':         'chin tuck',
  'Estabilização Cervical Isométrica':        'chin tuck',
  'Lib. Miofascial Trapézio Superior':        'upper trapezius stretch',
  'Retroflexão Suave':                        'cervical retraction',
  'Lib. Miofascial Iliopsoas':                'hip flexor stretch',
};
window.AV_CONNS  = AV_CONNS;
window.EX_EN_MAP = EX_EN_MAP;
