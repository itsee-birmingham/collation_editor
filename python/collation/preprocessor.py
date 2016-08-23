#-*- coding: utf-8 -*-
from __future__ import print_function
import json
from collation.postprocessor import PostProcessor
import urllib2
from collation.regulariser import Regulariser
import sys


def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)


class PreProcessor(Regulariser):
    
    def __init__(self, display_settings_config=None, local_python_functions=None, rule_conditions_config=None):
        self.display_settings_config = display_settings_config
        self.local_python_functions = local_python_functions
        self.rule_conds_config = rule_conditions_config
        Regulariser.__init__(self, rule_conditions_config, local_python_functions)
     
    def process_witness_list(self, data_input, requested_witnesses, rules, basetext_transcription, project, settings, collation_settings, accept):
        self.settings = settings
        data = data_input['data']
        collatable_witnesses = []
        om_witnesses = []
        lac_hands = []
        lac_witnesses = requested_witnesses #assume everything is lac until we find it
        witnesses = {}
        hand_to_transcript_map = {}
        verse = None
        basetext_siglum = None
        # Add all the witness texts and keep record of witnesses omitting the verse and lacunose witnesses
        for transcription_verse in data:
            #try to remove witness from lac_witnesses (if successful its not lac)
            try:
                lac_witnesses.remove(transcription_verse['transcription_id'])
            except:
                pass
            #now find your base text.
            #this is obtained by matching the basetext_transcription supplied in the project settings with the trascription_id value in the verse
            #if this matches and either the duplicate_pos key is not present or it is present and === 1 then we have a base text.
            #it is not clear how the NTVMR will supply duplicate verses because I don't think they have thought about it yet so this may not work accurately for their stuff
            #however it shouldn't break it just might not always select the first occurrence.
            if transcription_verse['transcription_id'] == basetext_transcription:
                if verse == None and ('duplicate_position' not in transcription_verse or transcription_verse['duplicate_position'] == 1):
                    verse = transcription_verse
                    basetext_siglum = verse['siglum']
                         
            #start to make the hand_id_map and also find our om witnesses and remove them
            try:
                trans_verse = transcription_verse['witnesses']
                for i, reading in enumerate(trans_verse):
                    hand_to_transcript_map[reading['id']] = transcription_verse['transcription_id'];
                    if len(reading['tokens']) == 0:
                        if 'gap_reading' in reading:
                            lac_hands.append(reading['id'])
                            trans_verse[i] = None
                        else:
                            om_witnesses.append(reading['id'])
                            trans_verse[i] = None
                for reading in reversed(trans_verse):
                    if reading is None:
                        trans_verse.remove(reading)     
            except KeyError:
                om_witnesses.append(transcription_verse['siglum'])
                hand_to_transcript_map[transcription_verse['siglum']] = transcription_verse['transcription_id'];
            else:
                collatable_witnesses.extend(trans_verse)
        
        witnesses['collatable'] = collatable_witnesses
        witnesses['lac'] = data_input['lac_witnesses'].keys()
        witnesses['lac'].extend(lac_hands)
        witnesses['om'] = om_witnesses
        #can this all be better so one thing does both WCE and NTVMR??
        #now add in lac witnesses to the mapping
        if 'lac_transcription' in data_input.keys():
            #this deals with NTVMR witnesses
            for i, docID in enumerate(data_input['lac_transcription']):
                hand_to_transcript_map[data_input['lac_witnesses'][i]] = docID
        else:
            hand_to_transcript_map.update(data_input['lac_witnesses'])
        
        witnesses['hand_id_map'] = hand_to_transcript_map
        if verse == None:
            if not basetext_siglum or basetext_siglum in witnesses['lac']:
                missing_reason = 'lac'
            elif basetext_siglum in witnesses['om']:
                missing_reason = 'om'
            else:
                missing_reason = 'unknown'
            verse = {'siglum': basetext_siglum, 
                     'missing_reason': missing_reason,
                     'index': 1
                     } 
        return self.regularise(rules, witnesses, verse, settings, collation_settings, project, accept)
    
    
    def regularise(self, decisions, witnesses, verse, settings, collation_settings, project, accept):
        """Regularise the witness."""
        eprint('There are %s decisions' % len(decisions))
        for witness in witnesses['collatable']:
            for token in witness['tokens']:
                hit, normalised, details = self.regularise_token(token, decisions, 'pre-collate')
                if hit:
                    token['n'] = normalised
                    if details != 'None':
                        try:
                            token['decision_class'].extend([c['class'] for c in details])
                        except:
                            token['decision_class'] = [c['class'] for c in details]
                        try:
                            token['decision_details'].extend(details)
                        except:
                            token['decision_details'] = details
        return self.get_collation(witnesses, verse, decisions, settings, collation_settings, project, accept)
    
    
    

    def get_collation(self, witnesses, verse, decisions, settings, collation_settings, project, accept):
        """
        Get the collation for the context.
        """
        algorithm = 'auto'
        tokenComparator = {}
        if collation_settings['algorithm']:
            algorithm = collation_settings['algorithm']
        if collation_settings['tokenComparator'] and collation_settings['tokenComparator']['type']:
            tokenComparator['type'] = 'levenshtein'
            if collation_settings['tokenComparator'] and collation_settings['tokenComparator']['distance']:
                tokenComparator['distance'] = collation_settings['tokenComparator']['distance']
            else:
                #default to 2
                tokenComparator['distance'] = 2
        else:
            tokenComparator['type'] = 'equality'
        
        if len(witnesses['collatable']) > 0:
            witness_list = {'witnesses': witnesses['collatable']}
            if (algorithm == 'auto'):
                algorithm = 'needleman-wunsch'
                for witness in witness_list['witnesses']:
                    if len(witness['tokens']) > 0 and 'gap_after' in witness['tokens'][-1].keys():
                        algorithm = 'dekker'
                        break
            eprint('preprocessing complete')
            collatex_response = self.do_collate(witness_list, accept, algorithm, tokenComparator,
                                                collation_settings['host'])
            # Start with raw XML types
            if accept == 'xml' or accept == 'graphml' or accept == 'tei':
                self.set_header("Content-Type", "application/xml; charset=UTF-8")
                self.write(collatex_response)
                self.finish()
                return
    
            # Next is raw JSON
            elif accept == 'json':
                self.set_header("Content-Type", "application/json; charset=UTF-8")
                self.write(collatex_response)
                self.finish()
                return
    
            try:
                alignment_table = json.loads(collatex_response)
            except ValueError:
                return self.return_error(collatex_response)

            #get overtext details
            overtext_details = self.get_overtext(verse)
            eprint('collation done')
            return self.do_post_processing(alignment_table, decisions, overtext_details[0], overtext_details[1], witnesses['om'], witnesses['lac'], witnesses['hand_id_map'], settings)
           
    def do_post_processing(self, alignment_table, decisions, overtext_name, overtext, om_readings, lac_readings, hand_id_map, settings):
        pp = PostProcessor(
            alignment_table=alignment_table,
            overtext_name=overtext_name,
            overtext=overtext,
            om_readings=om_readings,
            lac_readings=lac_readings,
            hand_id_map=hand_id_map,
            settings=settings,
            decisions = decisions,
            display_settings_config=self.display_settings_config,
            local_python_functions=self.local_python_functions,
            rule_conditions_config=self.rule_conds_config
            )
        output = pp.produce_variant_units()
        return output


    def get_overtext(self, verse):
        if 'witnesses' not in verse.keys():
            try:
                return [verse['siglum'], verse['missing_reason']]
            except:
                return [verse['siglum'], 'om']
        elif len(verse['witnesses']) == 1:
            return [verse['siglum'], verse['witnesses']]
        else:
            readings = []
            for witness in verse['witnesses']:
                readings.append(witness['id'])
            if '%s*' % verse['siglum'] in readings:
                return ['%s*' % verse['siglum'], [verse['witnesses'][readings.index('%s*' % verse['siglum'])]]]
            elif '%sT' % verse['siglum'] in readings:
                return ['%sT' % verse['siglum'], [verse['witnesses'][readings.index('%sT' % verse['siglum'])]]]
            else:
                logger.debug('no overtext was found')
                return [verse['witnesses'][0]['id'], [verse['witnesses'][0]]]

    def do_collate(self, payload, accept, algorithm, tokenComparator, host='localhost'):
        """Do the collation"""
        eprint('COLLATING')
        eprint('algorithm - %s' % (algorithm))
        eprint('tokenComparator - %s' % (tokenComparator))
        payload['algorithm'] = algorithm #'needleman-wunsch'#'dekker' #'needleman-wunsch'#'dekker-experimental'#
        payload['tokenComparator'] = tokenComparator #{"type": "levenshtein", "distance": 2}#{'type': 'equality'}
        target = 'http://%s/collate/' % host
        json_witnesses = json.dumps(payload)#, default=json_util.default)
        accept_header = self.convert_header_argument(accept)
        headers = {'content-type': 'application/json',
                   'Accept': accept_header}
        req = urllib2.Request(target, json_witnesses, headers)
        response = urllib2.urlopen(req)    
        return response.read()
    
    
    
    def convert_header_argument(self, accept):
        """Convert shortname to MIME type."""
        if accept == 'json' or accept == 'lcs':
            return "application/json"
        elif accept == 'tei':
            return "application/tei+xml"
        elif accept == 'graphml':
            return 'application/graphml+xml'
        elif accept == 'dot':
            return 'text/plain'
        elif accept == 'svg':
            return 'image/svg+xml'


