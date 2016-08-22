"""Models for collation

{'verse': 1
'book': 4,
'chapter': 1,
'word': 4
'witness': '01'}

Scope Field
-----------

    a) this place, this manuscript
    b) this place, all manuscripts
    c) everywhere, this manuscript 
    d) everywhere, every manuscript

* 'once', # this word, this manuscript
* ('these'), # this word, these manuscripts,
    this is not reflected on server-side
* 'verse', # this verse, all manuscripts
* 'manuscript', # always in this manuscript
* 'always' # always

Context field
-------------

once:
{'verse': 1
'book': 4,
'chapter': 1,
'word': 4
'witness': '20001'}

these:
implicit, list of 'once's

verse:
{'verse': 1
'book': 4,
'chapter': 1,
}

{'witness': '20001'
}

always {}

Decision types
--------------

'regularisation'

Collation model
===============

* Structure is the result of collating/combining/etc
* Context is {'book': '', 'chapter': '', verse: ''}
* Status is one of:
    * 'regularised' - Has been regularised
    * 'set' - variants have been set
    * 'ordered' - variants have been ordered

"""

MODELS = (
    {'_id': 'collation',
     '_model': '_model',
    '_permissions': {'read': True, 'create': True, 'update': True, 'delete': True,
                         'required' : False},
     'modeldescription': "A user's collation",
     'structure': {
            'field': 'Dict',
            },
     'context': {
            'field': 'Char',
            },
     'book_number': {
            'field': 'Integer'
            },
     'chapter': {
            'field': 'Integer'
            },
     'verse': {
            'field': 'Integer'
            },
     'status': {
            'field': 'Char',
            },
     'user': {
            'field': 'Char',
            'required': True
            },
     'project': {
            'field': 'Char',
            'required': False     
            },
     'display_settings': {
            'field': 'Dict',
            'required': True
            },
     'data_settings': {
            'field': 'Dict',
            'required': True
            },
     'algorithm_settings': {
            'field': 'Dict',
            'required': True
            }
     },
          
    {
        '_id': 'main_apparatus',
        '_model': '_model',
        '_permissions': {'read': True, 'create': True, 'update': True, 'delete': True,
                         'required' : False
            },
        'modeldescription': 'The approved and slightly modified output of the collation app',
         'structure': {
                'field': 'Dict',
                },
         'context': {
                'field': 'Char',
                },
        'book_number': {
                'field': 'Integer'
                },
        'chapter': {
                'field': 'Integer'
                },
        'verse': {
                'field': 'Integer'
                },
         'user': {
                'field': 'Char',
                'required': True
                },
         'project': {
                'field': 'Char',
                'required': False     
                },
         'display_settings': {
                'field': 'Dict',
                'required': True
                },
         'data_settings': {
                'field': 'Dict',
                'required': True
                },
         'algorithm_settings': {
                'field': 'Dict',
                'required': True
                }
         },

    {
        '_id': 'decision',
        '_model': '_model',
        '_view': {'sort': 'scope',
                  'instance': ['scope', 'class', 'context', 't', 'n', 'comments'],
                  'list' : {'read' : [{'type': 'link',
                                        'href': '/collation/decision',
                                        'text': 'view',
                                        'params': {'rule': 'VAR-_id'}}, 
                                        'scope', 'class', 'context', 't', 'n', 'comments',
                                        {'type': 'link',
                                         'href': '/collation/decision/edit/',
                                         'text': 'edit',
                                         'params': {'decision': 'VAR-_id'}}],
                            'update' : [{'type': 'link',
                                        'href': '/collation/decision',
                                        'text': 'view',
                                        'params': {'decision': 'VAR-_id'}}, 
                                        'scope', 'class', 'context', 't', 'n', 'comments',
                                        {'type': 'link',
                                         'href': '/collation/decision/edit/',
                                         'text': 'edit',
                                         'params': {'decision': 'VAR-_id'}}]},
                  'required': False},
        '_permissions': {'read': True, 'create': True, 'update': True, 'delete': True,
                         'required' : False},
        'modeldescription': 'An editorial decision',
        'type': {
            'field': 'Char',
            },
        'subtype': {
            'field': 'Char',   
            'required': False    
            },
        'scope': {  # global, witness, local,
            'field': 'Char',
        },
        'class': {#phonetic, spelling, nonsense
            'field': 'Char',
        },
        'active': {
            'field': 'Boolean',
            'default': True,
            'required': False
            },
        'context': {  # B04K1V1
            'field': 'Dict',
            'required': False
            },
        'conditions': { # nomSac = true, ignore supplied, ignore unclear etc.
            'field': 'Dict',
            'required': False         
            },
        'exceptions': { # only relevant to global/always rules, A list of context (BKV as string) where this rule should not be applied
            'field': 'List',
            'required': False       
            },
        'comments': {
            'field': 'Text',
            'required': False
            },
        't': {  # token
            'field': 'Char',
            'required': False
            },
        'n': {  # normal
            'field': 'Char',
            'required': False
            },
        'user': {
            'field': 'Char',
            'required': False
            },
        'project': {  # normal
            'field': 'Char',
            'required': False
            },
        'preloaded': {
            'field': 'Boolean',
            'required': False
            },
        },
          
    {
        '_id': 'version_data',
        '_model': '_model',
        '_permissions': {'read': True, 'create': True, 'update': True, 'delete': True,
                         'required' : False
            },
        'modeldescription': 'versional data to add to apparatus',
        'language': {
            'field': 'Char'
            },
        'context': {'field': 'Char'
            },
        'project': {
            'field': 'Char'
            },
        'data': {'field': 'Dict'
            },
        'user': {'field': 'Char'
                 },
        'submitted': {'field': 'Boolean',
                      'required': False
                      },
       'submitted_to_version_editor': {'field': 'Boolean',
                      'required': False
                      },
        'book_number': {'field': 'Integer',
                 'required': False
                 },
        'chapter': {'field': 'Integer',
                 'required': False
                 },
         'verse': {'field': 'Integer',
                 'required': False
                 },                
        },
          
          
        {'_id': 'editing_project',
         '_model': '_model',
         '_permissions': {'read': True, 'create': True, 'update': True, 'delete': True,
                             'required' : False},
         'modeldescription': "Details of an editing project such as the ECM",
         #general
         'project': {
                'field': 'Char',
                }, 
         'language': {
                'field': 'Char',
                },
         'book': {
                'field': 'Integer',
                },
         'book_name': {
                'field': 'Char',
                },
         'managing_editor': {
                'field': 'Char',
                },
        'editors': {
                'field': 'List',
                },   
         #for each of the following sections everything must be optional because different projects
         #will be at different stages and may only ever contain details about a single stage
         #users will have to be trusted and perhaps each phase needs to check it knows enough 
         #before allowing someone to start
         
         #transcription
        'transcription_repository': {
                'field': 'Char',
                'required': False
                },
        'transcription_workflow': {
                'field': 'Char',
                'required': False
                },
        'transcription_base_text': {
                 'field': 'Char',
                 'required': False
                },
        'transcribers': {
                'field': 'List',
                'required': False
                },
        'reconcilers': {
                'field': 'List', 
                'required': False
                },
        #editing live transcriptions
        'published_transcription_managers': {
                'field': 'List',
                'required': False
                },
        'transcription_managers': {
                'field': 'List',
                'required': False                          
                },
         'document_types': {
                'field': 'List',
                'required': False            
                },
         #collation
         'collation_source': {
                'field': 'Char',
                },
         'base_text': {
                'field': 'Char',
                'required': False
                },
         'V_for_supplied': {
                'field': 'Boolean',
                'required': False
                },
         'regularisation_classes': {
                'field': 'List',
                'required': False             
              },
         'witnesses': {
                'field': 'List',
                'required': False
                },

        #versions
        'versionists' : {
           'field': 'Dict',
           'required': False
           },
         'version_subtypes' : {
           'field': 'Dict',
           'required': False
           },
        'versions': {
           'field': 'Dict',
           'required': False
           },
         },
    )
