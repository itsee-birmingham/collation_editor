from collation.nt_exporter import NTExporter
from pymongo import Connection
import xml.etree.ElementTree as etree

class ECMExporter(NTExporter):
    
    def export_data(self, data, format='positive_xml', ignore_basetext=False):
        if format == 'cbgm':
            duplicate_verse_setting = 'use_agreements' # also include 'remove_all', 'use_first', 'use_agreements'
            return self.get_CBGM(data, duplicate_verse_setting)
        filtered_data = self.filter_hands(data)
        xml = self.get_structured_xml(filtered_data, ignore_basetext)
        if format == 'positive_xml':
            return xml
        if format == 'negative_xml':          
            return self.get_structured_xml(filtered_data, ignore_basetext, True)
        if format == 'positive_plain':         
            return self.get_positive_plain(xml)
        if format == 'negative_plain':
            return self.get_negative_plain(xml)
        if format == 'abbreviated_positive_plain':
            return self.get_abbreviated_positive_plain(xml)

    def get_CBGM(self, data, duplicate_verse_setting):
        basetext = data[0]['structure']['overtext'][0]['id']
        cbgm = []
        for entry in data:
            hand_id_map = entry['structure']['hand_id_map']
            for_ignoring = self.cbgm_prep(entry, duplicate_verse_setting)
            for_ignoring[4].remove(basetext)
            zw_wits = list(set([x[:x.find('-')] for x in for_ignoring[0]]))
            context = entry['context']
            book = int(context[context.find('B')+1:context.find('K')])
            chapter = int(context[context.find('K')+1:context.find('V')])
            verse = int(context[context.find('V')+1:])   

            for key in entry['structure']:
                if key.find('apparatus') != -1:                   
                    for unit in entry['structure'][key]:
                        overlapping_a_support = [];
                        if key != 'apparatus': #then we are dealing with an overlapping unit and we need to get all a reading support
                             overlapping_a_support = self.get_overlapping_a_support(entry['structure']['apparatus'], unit, for_ignoring, hand_id_map, basetext)
                            
                        unit_cbgm = []
                        expected_transcriptions = list(for_ignoring[4])#copy the list of expected transcriptions so we definitely have an entry for each             
                        start = unit['start']
                        end = unit['end']
                        lemma = None
                        label_list = []
                        for reading_pos, reading in enumerate(unit['readings']):
                            double_rdg_support = False #marker to see if we are looking at an ambiguous reading
                            #establish lemma
                            if basetext in reading['witnesses'] and lemma == None:
                                lemma = self.get_text(reading)[0]
                            #establish label and whether this is an ambiguous reading
                            label = reading['label']                            
                            if label.find('/') != -1:
                                double_rdg_support = True
                            
                            #get reading text
                            reading_text = self.get_text(reading)[0]
                            if reading_text == '':
                                reading_text = 'lac'
                            label_suffix = ''
                            if key != 'apparatus' and reading_pos == 0: #then we are dealing with an overlapping unit
                                reading['witnesses'].extend(overlapping_a_support)
                            for witness in reading['witnesses']:                              
                                if witness not in for_ignoring[0] and witness not in for_ignoring[1] and witness != basetext:                                    
                                    wit = hand_id_map[witness].split('_')[2] #extract witness from id
                                    if wit in for_ignoring[2]:
                                        if wit in expected_transcriptions: #if we have not already dealt with it
                                            if set(self.remove_lacs(for_ignoring[2][wit][:], unit)).issubset(set(reading['witnesses'])): #if all of the instances of this verse support this reading in this unit
                                                hand = witness.replace(for_ignoring[3][witness], '')
                                                data_line = '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' % (book, chapter, verse, lemma, start, end, label, label_suffix, reading_text, wit, hand)
                                                if label not in label_list:
                                                    label_list.append(label)
                                            else:
                                                hand = witness.replace(for_ignoring[3][witness], '')
                                                data_line = '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' % (book, chapter, verse, lemma, start, end, 'zw', '', 'lac', wit, hand)  
                                            expected_transcriptions.remove(wit)                                                
                                            unit_cbgm.append(data_line)
                                        else:
                                            pass #we have already dealt with this witness so we can ignore it this time
                                            
                                    else:
                                        expected_transcriptions.remove(wit)
                                        hand = witness.replace(for_ignoring[3][witness], '')
                                        if double_rdg_support == True:
                                            data_line = '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' % (book, chapter, verse, lemma, start, end, 'zw', '', 'lac', wit, hand)
                                        else:
                                            data_line = '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' % (book, chapter, verse, lemma, start, end, label, label_suffix, reading_text, wit, hand)
                                            if label not in label_list:
                                                label_list.append(label)
                                        unit_cbgm.append(data_line)
                            if 'subreadings' in reading:
                                for type in reading['subreadings']:
                                    for sr in reading['subreadings'][type]:
                                        label_suffix = type
                                        for witness in sr['witnesses']:
                                            if witness not in for_ignoring[0] and witness not in for_ignoring[1] and witness != basetext: 
                                                wit = hand_id_map[witness].split('_')[2]
                                                if wit in for_ignoring[2]:
                                                    if wit in expected_transcriptions: #if we have not already dealt with it
                                                        if set(self.remove_lacs(for_ignoring[2][wit][:], unit)).issubset(set(sr['witnesses'])): #if all of the instances of this verse support this reading in this unit
                                                             hand = witness.replace(for_ignoring[3][witness], '')
                                                             data_line = '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' % (book, chapter, verse, lemma, start, end, label, label_suffix, reading_text, wit, hand)
                                                             if label not in label_list:
                                                                 label_list.append(label)
                                                        else:
                                                            hand = witness.replace(for_ignoring[3][witness], '')
                                                            data_line = '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' % (book, chapter, verse, lemma, start, end, 'zw', '', 'lac', wit, hand)
                                                        expected_transcriptions.remove(wit)                                                
                                                        unit_cbgm.append(data_line)   
                                                    else:
                                                        pass #we have already dealt with this witness so we can ignore it this time
                                                    
                                                else:
                                                    expected_transcriptions.remove(wit)
                                                    hand = witness.replace(for_ignoring[3][witness], '')
                                                    if double_rdg_support == True:
                                                        data_line = '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' % (book, chapter, verse, lemma, start, end, 'zw', '', 'lac', wit, hand)
                                                    else:
                                                        data_line = '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' % (book, chapter, verse, lemma, start, end, label, label_suffix, reading_text, wit, hand)
                                                        if label not in label_list:
                                                            label_list.append(label)
                                                    unit_cbgm.append(data_line)
                        for witness in zw_wits:
                            expected_transcriptions.remove(witness)
                            data_line = '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' % (book, chapter, verse, lemma, start, end, 'zw', '', 'lac', witness, '')
                            unit_cbgm.append(data_line)
                        for witness in expected_transcriptions:
                            data_line = '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' % (book, chapter, verse, lemma, start, end, 'zz', '', 'lac', witness, '')
                            unit_cbgm.append(data_line)
                        if self.has_variation(label_list):
                            cbgm.extend(unit_cbgm) 
        return ' '.join(cbgm)
    
    def get_overlapping_a_support(self, top_line, overlapping_unit, for_ignoring, hand_id_map, basetext):
        potential_witnesses = []
        for unit in top_line:
            if 'overlap_units' in unit and overlapping_unit['_id'] in unit['overlap_units']:
                witnesses = unit['readings'][0]['witnesses'][:]
                if 'subreadings' in unit['readings'][0]:
                    for key in unit['readings'][0]['subreadings']:
                        for sr in unit['readings'][0]['subreadings'][key]:
                            witnesses.extend(sr['witnesses'][:])
                genuine_witnesses = []
                for witness in witnesses:
                    if witness not in for_ignoring[0] and witness not in for_ignoring[1] and witness != basetext:
                        wit = hand_id_map[witness].split('_')[2]
                        if wit in for_ignoring[2]:
                            if wit not in genuine_witnesses: #make sure we haven't dealt with it already
                                if set(self.remove_lacs(for_ignoring[2][wit][:], unit)).issubset(set(witnesses)): #if all of the instances of this verse support this reading in this unit
                                    genuine_witnesses.append(witness)
                            else:
                                pass
                        else:
                            genuine_witnesses.append(witness)
                potential_witnesses.append(set(genuine_witnesses))
        a_support_witnesses = list(set.intersection(*potential_witnesses))
        #now remove any that are in the overlapping unit itself - they could be reordered words which all support a but not in order
        for i in range(1, len(overlapping_unit['readings'])):
            for witness in overlapping_unit['readings'][i]['witnesses']:
                if witness in a_support_witnesses:
                    a_support_witnesses.remove(witness)
            if 'subreadings' in overlapping_unit['readings'][i]:
                for key in overlapping_unit['readings'][i]['subreadings']:
                    for sr in overlapping_unit['readings'][i]['subreadings'][key]:
                        for witness in sr['witnesses']:
                            if witness in a_support_witnesses:
                                a_support_witnesses.remove(witness)
        return a_support_witnesses
        
    
    def remove_lacs(self, witness_list, unit):   
        for reading in unit['readings']:
            if reading['text'] == [] and 'type' in reading and  reading['type'] == 'lac':
                for witness in witness_list[:]:
                    if witness in reading['witnesses']:
                        witness_list.remove(witness)        
        return witness_list
        
    def has_variation(self, label_list):
        count = 0
        for label in label_list:
            if label not in ['zz', 'zu'] and '/' not in label:
                count += 1
        if count > 1:
            return True
        return False

    def cbgm_prep(self, entry, duplicate_verse_setting):
        connection = Connection()
        verses = connection['vmr']['verse']
    
        #we only need one hand and one verse per witness
        id_hand_map = {}
        make_zw = []
        lose_hands = []
        agreement_hands = {}
        hand_transcription_sigla_lookup = {}
        verse_details_to_get = []
        full_transcription_sigla_list = []
        #switch this dictionary so it is transcription_id to hand 
        for hand in entry['structure']['hand_id_map']:
            if entry['structure']['hand_id_map'][hand] in id_hand_map:
                id_hand_map[entry['structure']['hand_id_map'][hand]].append(hand)
            else:
                id_hand_map[entry['structure']['hand_id_map'][hand]] = [hand]
                full_transcription_sigla_list.append(entry['structure']['hand_id_map'][hand].split('_')[2])

        for tid in id_hand_map:
            if len(id_hand_map[tid]) == 1:
                hand_transcription_sigla_lookup[id_hand_map[tid][0]] = id_hand_map[tid][0] #this looks weird but it is basically what you need to get an empty string for the hand which is always the case here. It allows lection details to be stripped in the same way it works for ones with hand data
            else:
                #add the transcription id to a list so we can retrieve all verse details in one go (its quicker)
                verse_details_to_get.append(tid)

        #go and get the verse details and make some decisions
        vs = verses.find({'context': entry['context'], 'transcription_id': {'$in': verse_details_to_get}}, ['context', 'siglum', 'duplicate_position', 'transcription_siglum', 'transcription_id'])
        for v in vs:
            #if there is a pos value in the verse details we can assume there are two instances and all hands can be added to the make lacunose list
            if duplicate_verse_setting == 'remove_all' and 'duplicate_position' in v:
                for hand in id_hand_map[v['transcription_id']]:
                    if v['siglum'] in hand:
                        make_zw.append(hand)
                        hand_transcription_sigla_lookup[hand] = v['siglum']
                        
            elif duplicate_verse_setting == 'use_first' and 'duplicate_position' in v and v['duplicate_position'] != 1:
                for hand in id_hand_map[v['transcription_id']]:
                    if v['siglum'] in hand:
                        lose_hands.append(hand)
                        hand_transcription_sigla_lookup[hand] = v['siglum']
            elif duplicate_verse_setting == 'use_agreements' and 'duplicate_position' in v:
                hands = [x.replace(v['siglum'], '') for x in id_hand_map[v['transcription_id']]]
                if 'C*' in hands:
                    target = '%sC*' % v['siglum']
                elif '*' in hands:
                    target = '%s*' % v['siglum']
                else:
                    target = v['siglum']
                for hand in id_hand_map[v['transcription_id']]:
                    if v['siglum'] in hand:
                        if hand != target:
                            lose_hands.append(hand)
                        else:
                            if v['transcription_siglum'] not in agreement_hands:
                                agreement_hands[v['transcription_siglum']] = []
                            agreement_hands[v['transcription_siglum']].append(target)
                        hand_transcription_sigla_lookup[hand] = v['siglum']
            else:
                hands = [x.replace(v['siglum'], '') for x in id_hand_map[v['transcription_id']]]
                if 'C*' in hands:
                    target = '%sC*' % v['siglum']
                elif '*' in hands:
                    target = '%s*' % v['siglum']
                else:
                    target = v['siglum']
                for hand in id_hand_map[v['transcription_id']]:
                    if v['siglum'] in hand:
                        if hand != target:
                            lose_hands.append(hand)
                        hand_transcription_sigla_lookup[hand] = v['siglum']
                        
        make_zw = list(set(make_zw))
        lose_hands = list(set(lose_hands))
#         print('**************************')
#         print(make_zw)
#         print(lose_hands)
#         print(agreement_hands)
#         print(hand_transcription_sigla_lookup)
#         print(full_transcription_sigla_list)
        
        return [make_zw, lose_hands, agreement_hands, hand_transcription_sigla_lookup, full_transcription_sigla_list]   


# This is the original CBGM output which all duplicate verses listed as zw (lac) and all variation units regardless of actual variation included
        
#     def get_CBGM(self, data):
#         basetext = data[0]['structure']['overtext'][0]['id']
#         cbgm = []
#         for entry in data:
#             hand_id_map = entry['structure']['hand_id_map']
#             for_ignoring = self.cbgm_prep(entry)
#             for_ignoring[3].remove(basetext)
#             zw_wits = list(set([x[:x.find('-')] for x in for_ignoring[0]]))
#             context = entry['context']
#             book = int(context[context.find('B')+1:context.find('K')])
#             chapter = int(context[context.find('K')+1:context.find('V')])
#             verse = int(context[context.find('V')+1:])   
#             print('%s:%s' % (chapter, verse))       
#             for key in entry['structure']:
#                 if key.find('apparatus') != -1:
#                     for unit in entry['structure'][key]:
#                         expected_transcriptions = list(for_ignoring[3])#copy the list of expected transcriptions                
#                         start = unit['start']
#                         end = unit['end']
#                         lemma = None
#                         for reading in unit['readings']:
#                             double_rdg_support = False
#                             if basetext in reading['witnesses'] and lemma == None:
#                                 lemma = self.get_text(reading)[0]
#                             label = reading['label']
#                             if label.find('/') != -1:
#                                 double_rdg_support = True
#                             reading_text = self.get_text(reading)[0]
#                             if reading_text == '':
#                                 reading_text = 'lac'
#                             label_suffix = ''
# 
#                             for witness in reading['witnesses']:
#                                 
#                                 if witness not in for_ignoring[0] and witness not in for_ignoring[1] and witness != basetext:                                    
#                                     wit = hand_id_map[witness].split('_')[2]
#                                     
#                                     expected_transcriptions.remove(wit)
#                                     hand = witness.replace(for_ignoring[2][witness], '')
#                                     if double_rdg_support == True:
#                                         data_line = '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' % (book, chapter, verse, lemma, start, end, 'zw', '', 'lac', wit, hand)
#                                     else:
#                                         data_line = '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' % (book, chapter, verse, lemma, start, end, label, label_suffix, reading_text, wit, hand)
#                                     cbgm.append(data_line)
#                             if 'subreadings' in reading:
#                                 for type in reading['subreadings']:
#                                     for sr in reading['subreadings'][type]:
#                                         label_suffix = type
#                                         for witness in sr['witnesses']:
#                                             if witness not in for_ignoring[0] and witness not in for_ignoring[1] and witness != basetext: 
#                                                 wit = hand_id_map[witness].split('_')[2]
#                                                 expected_transcriptions.remove(wit)
#                                                 hand = witness.replace(for_ignoring[2][witness], '')
#                                                 if double_rdg_support == True:
#                                                     data_line = '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' % (book, chapter, verse, lemma, start, end, 'zw', '', 'lac', wit, hand)
#                                                 else:
#                                                     data_line = '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' % (book, chapter, verse, lemma, start, end, label, label_suffix, reading_text, wit, hand)
#                                                 cbgm.append(data_line)
#                         for witness in zw_wits:
#                             expected_transcriptions.remove(witness)
#                             data_line = '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' % (book, chapter, verse, lemma, start, end, 'zw', '', 'lac', witness, '')
#                             cbgm.append(data_line)
#                         for witness in expected_transcriptions:
#                             data_line = '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' % (book, chapter, verse, lemma, start, end, 'zz', '', 'lac', witness, '')
#                             cbgm.append(data_line)
#  
#         return ' '.join(cbgm)
#      
#         
#     def cbgm_prep(self, entry):
#         connection = Connection()
#         verses = connection['vmr']['verse']
#     
#         #we only need one hand and one verse per witness
#         id_hand_map = {}
#         make_zw = []
#         loose_hands = []
#         hand_transcription_sigla_lookup = {}
#         verse_details_to_get = []
#         full_transcription_list = []
#         #switch this dictionary so it is transcription_id to hand 
#         for hand in entry['structure']['hand_id_map']:
#             if entry['structure']['hand_id_map'][hand] in id_hand_map:
#                 id_hand_map[entry['structure']['hand_id_map'][hand]].append(hand)
#             else:
#                 id_hand_map[entry['structure']['hand_id_map'][hand]] = [hand]
#                 full_transcription_list.append(entry['structure']['hand_id_map'][hand].split('_')[2])
#         for tid in id_hand_map:
#             if len(id_hand_map[tid]) == 1:
#                 hand_transcription_sigla_lookup[id_hand_map[tid][0]] = id_hand_map[tid][0] #this looks weird but it is basically what you need to get an empty string for the hand which is always the case here. It allows lection details to be stripped in the same way it works for ones with hand data
#             else:
#                 #add the transcription id to a list so we can retrieve all verse details in one go (its quicker)
#                 verse_details_to_get.append(tid)
#           
#         #go and get the verse details and make some decisions
#         vs = verses.find({'context': entry['context'], 'transcription_id': {'$in': verse_details_to_get}}, ['context', 'siglum', 'duplicate_position', 'transcription_siglum', 'transcription_id'])
#         for v in vs:
#             #if there is a pos value in the verse details we can assume there are two instances and all hands can be added to the make lacunose list
#             if 'duplicate_position' in v:
#                 make_zw.extend(id_hand_map[v['transcription_id']])
#                 for h in id_hand_map[v['transcription_id']]:
#                     hand_transcription_sigla_lookup[h] = v['siglum']
#             #if there is no pos value we can select a hand and add all the others to the lose hands list
#             #at this point we have removed any readings that have multiple instances and therefore we can extract hands by simply removing the siglum
#             else:
#                 hands = [x.replace(v['siglum'], '') for x in id_hand_map[v['transcription_id']]]
#                 if 'C*' in hands:
#                     target = '%sC*' % v['siglum']
#                 elif '*' in hands:
#                     target = '%s*' % v['siglum']
#                 else:
#                     target = v['siglum']
#                 
#                 for hand in id_hand_map[v['transcription_id']]:
#                     hand_transcription_sigla_lookup[hand] = v['siglum']
#                     if hand != target:
#                         loose_hands.append(hand)
#         make_zw = list(set(make_zw))
#         return [make_zw, loose_hands, hand_transcription_sigla_lookup, full_transcription_list]   
        
    def get_abbreviated_positive_plain(self, xml):
        pp_app = []
        tree = etree.fromstring(xml)
        for verse in tree.findall('.//tei:ab', namespaces={'tei': 'http://www.tei-c.org/ns/1.0'}):
            vid = verse.get('{http://www.w3.org/XML/1998/namespace}id').replace('-APP', '')
            pp_app.append(vid)
            pp_app.append('\n')
            previous_lemma = None
            for app_unit in verse.findall('.//tei:app', namespaces={'tei': 'http://www.tei-c.org/ns/1.0'}):
                omission = False
                added_before = False
                if app_unit.get('from') and int(app_unit.get('from'))%2 == 1 and app_unit.get('from') == app_unit.get('to'):
                    omission = True
                    if app_unit.get('from') == '1':
                        added_before = True
                rdgs = []
                for elem in app_unit:
                    #lemma
                    if elem.tag == '{http://www.tei-c.org/ns/1.0}lem':
                        if elem.get('type') == 'om'and omission == True:
                            if added_before == True:
                                pp_app.append('<ad init>')
                            else:
                                pp_app.append(previous_lemma)
                        else:
                            lemma = elem.text
                            pp_app.append(elem.text)
                        pp_app.append(' ')
                    #other readings                  
                    elif elem.tag == '{http://www.tei-c.org/ns/1.0}rdg': 
                        if elem.text == lemma or (omission == True and elem.text == 'om'):
                            pp_app.append(elem.get('wit'))
                            pp_app.append(' ] ')
                        else:
                            rdg = []
                            if elem.text is not None: #if it is none then it is overlapped or deleted and we don't need to record it                              
                                if elem.get('type') == 'om'and omission == True:
                                    rdg.append(previous_lemma)
                                elif omission == True:
                                    rdg.append('+ %s' % elem.text)
                                else:                                
                                    rdg.append(elem.text)
                                rdg.append(' ')
                                rdg.append(elem.get('wit'))
                                rdgs.append(''.join(rdg))
                if len(rdgs) > 0:
                    pp_app.append('; '.join(rdgs))
                previous_lemma = lemma         
                pp_app.append('\n')
        return ''.join(pp_app)
    
    def get_positive_plain(self, xml):
        pp_app = []
        tree = etree.fromstring(xml)
        for verse in tree.findall('.//tei:ab', namespaces={'tei': 'http://www.tei-c.org/ns/1.0'}):
            vid = verse.get('{http://www.w3.org/XML/1998/namespace}id').replace('-APP', '')
            pp_app.append(vid)
            pp_app.append('\n')
            previous_lemma = None
            for app_unit in verse.findall('.//tei:app', namespaces={'tei': 'http://www.tei-c.org/ns/1.0'}):
                omission = False
                added_before = False
                if app_unit.get('from') and int(app_unit.get('from'))%2 == 1 and app_unit.get('from') == app_unit.get('to'):
                    omission = True
                    if app_unit.get('from') == '1':
                        added_before = True
                rdgs = []
                for elem in app_unit:
                    #lemma
                    if elem.tag == '{http://www.tei-c.org/ns/1.0}lem':
                        if elem.get('type') == 'om'and omission == True:
                            if added_before == True:
                                pp_app.append('<ad init>')
                            else:
                                pp_app.append(previous_lemma)
                        else:    
                            lemma = elem.text
                            pp_app.append(elem.text)
                        pp_app.append(' ]')
                        pp_app.append(' ')  
                    #other readings                  
                    elif elem.tag == '{http://www.tei-c.org/ns/1.0}rdg':
                        rdg = []
                        if elem.text is not None: #if it is none then it is overlapped or deleted and we don't need to record it
                            if elem.get('type') == 'om' and omission == True and added_before == True:
                                rdg.append('om')
                            elif elem.get('type') == 'om'and omission == True:
                                rdg.append(previous_lemma)
                            elif omission == True:
                                rdg.append('+ %s' % elem.text)
                            else:
                                rdg.append(elem.text)
                            rdg.append(' ')
                            rdg.append(elem.get('wit'))
                            rdgs.append(''.join(rdg))
                if len(rdgs) > 0:
                    pp_app.append('; '.join(rdgs))   
                previous_lemma  = lemma    
                pp_app.append('\n')
        return ''.join(pp_app)

    def get_negative_plain(self, xml):
        np_app = []
        tree = etree.fromstring(xml)
        for verse in tree.findall('.//tei:ab', namespaces={'tei': 'http://www.tei-c.org/ns/1.0'}):
            vid = verse.get('{http://www.w3.org/XML/1998/namespace}id').replace('-APP', '')
            np_app.append(vid)
            np_app.append('\n')
            previous_lemma = None
            for app_unit in verse.findall('.//tei:app', namespaces={'tei': 'http://www.tei-c.org/ns/1.0'}):
                omission = False
                added_before = False
                if app_unit.get('from') and int(app_unit.get('from'))%2 == 1 and app_unit.get('from') == app_unit.get('to'):
                    omission = True
                    if app_unit.get('from') == '1':
                        added_before = True
                rdgs = []
                for elem in app_unit:
                    #lemma
                    if elem.tag == '{http://www.tei-c.org/ns/1.0}lem':
                        if elem.get('type') == 'om'and omission == True:
                            if added_before == True:
                                lemma = '<ad init>'
                            else:
                                lemma = previous_lemma
                        else:
                            lemma_text = elem.text   
                            lemma = elem.text      
                    #other readings                  
                    elif elem.tag == '{http://www.tei-c.org/ns/1.0}rdg':
                        if elem.text == lemma_text or (omission == True and elem.text == 'om'):
                            pass
                        else:
                            rdg = []
                            if elem.text is not None: #if it is none then it is overlapped or deleted and we don't need to record it
                                if elem.get('type') == 'om'and omission == True:
                                    rdg.append(previous_lemma)
                                elif omission == True:
                                    rdg.append('+ %s' % elem.text)
                                else:
                                    rdg.append(elem.text)
                                rdg.append(' ')
                                rdg.append(elem.get('wit'))
                                rdgs.append(''.join(rdg))
                if len(rdgs) > 0:
                    np_app.append(lemma)
                    np_app.append(' ]')
                    np_app.append(' ') 
                    np_app.append('; '.join(rdgs))            
                    np_app.append('\n')
                previous_lemma = lemma_text
        return ''.join(np_app)
        
    
    def all_hands_present(self, hand_list, reading_witnesses):
        for hand in hand_list:
            if hand not in reading_witnesses:
                return False            
        return True
    
    def all_share_suffix(self, hand_list, reading_witnesses, reading_suffixes):
        suffix = None
        for hand in hand_list:
            if suffix == None:
                suffix = reading_suffixes[reading_witnesses.index(hand)]
            if reading_suffixes[reading_witnesses.index(hand)] != suffix:
                return False
        return True
    
    def get_lowest_index_of_hand(self, hand_list, reading_witnesses):
        index = len(reading_witnesses) + 2
        for hand in hand_list:
            position = reading_witnesses.index(hand)
            if position < index:
                index = position
        return index
    
    #this list is fine for John but may need expanding for Mark and others
    def get_hand_abbr (self, hand_string):
        if hand_string == 'firsthand':
            return 'C*'
        if hand_string.find('corrector') != -1:
            return hand_string.replace('corrector', 'C')
        if hand_string == 'secunda_manu':
            return 'Csm'
        if hand_string == 'manu_recentissima':
            return 'Csm'
        return hand_string
    
    def expand_sigla_lookup (self, sigla_lookup):
        for key in sigla_lookup:
            sigla_lookup[key]['hands'] = ['%s' % (self.get_hand_abbr(h)) for h in sigla_lookup[key]['hands']]
            if len(sigla_lookup[key]['hands']) > 0:
                sigla_lookup[key]['hands'].insert(0, '*')
        return sigla_lookup
    
    #take all the hands we are expecting for this MS in this verse and order them chronologically using the list from the transcription header
    def order_expected_hands (self, hand_list, siglum, chron_hands):
        new_hand_list = []
        for hand in chron_hands:
            if '%s%s' % (siglum, hand) in hand_list:
                new_hand_list.append('%s%s' % (siglum, hand))
        for hand in hand_list: #this makes sure and Alt hands are added at the end - these are out of the chronological flow and always appear in units where a MS is split between readings
            if hand not in new_hand_list:
                new_hand_list.append(hand)
        return new_hand_list
        
    def get_witnesses(self, reading, missing):
        witnesses = reading['witnesses']
        for miss in missing:
            if miss in witnesses:
                witnesses.remove(miss)
        return witnesses
        
    
    def filter_hands(self, data):
        transcription_list = []
        sigla_lookup = {}
        for tid in data[0]['structure']['hand_id_map']:
            if data[0]['structure']['hand_id_map'][tid] not in transcription_list:
                transcription_list.append(data[0]['structure']['hand_id_map'][tid])
        connection = Connection()
        transcriptions = connection['vmr']['transcription']
        verses = connection['vmr']['verse']
        ts = transcriptions.find({'_id': {'$in': transcription_list}}, ['siglum', 'corrector_order'])
        for t in ts:
            sigla_lookup[t['_id']] = {'base_siglum': t['siglum']}
            if 'corrector_order' in t:
                sigla_lookup[t['_id']]['hands'] = t['corrector_order']
            else:
                sigla_lookup[t['_id']]['hands'] = []
        sigla_lookup = self.expand_sigla_lookup(sigla_lookup)
        vs = verses.find({'context': {'$in': [x['context'] for x in data]}, 'transcription_id': {'$in': transcription_list}, 'witnesses.1': {'$exists': True}}, ['context', 'siglum', 'witnesses', 'transcription_id'])
        hand_list = {}
        for v in vs:
            if v['context'] not in hand_list:
                hand_list[v['context']] = {}
            if v['siglum'] not in hand_list[v['context']]:
                hand_list[v['context']][v['siglum']] = {}
            hand_list[v['context']][v['siglum']]['hands'] = [x['id'] for x in v['witnesses']]
            hand_list[v['context']][v['siglum']]['transcription_id'] = v['transcription_id']
        for entry in data:
            context = entry['context']
            if context in hand_list:
                for key in entry['structure']:
                    if key.find('apparatus') != -1:                       
                        for i, unit in enumerate(entry['structure'][key]):             
                            for siglum in hand_list[context]:
                                ordered_expected_hands = self.order_expected_hands(hand_list[context][siglum]['hands'], siglum, sigla_lookup[hand_list[context][siglum]['transcription_id']]['hands'])
                                for reading in unit['readings']:
                                    self.fix_reading_hands(reading, siglum, ordered_expected_hands)
                                    if 'subreadings' in reading:
                                        for type in reading['subreadings']:
                                            for subreading in reading['subreadings'][type]:
                                                self.fix_reading_hands(subreading, siglum, ordered_expected_hands)
            #now always merge sigla and suffixes
            self.merge_sigla_and_suffixes(entry)
        return data
            
    def fix_reading_hands(self, reading, siglum, ordered_expected_hands):
        hands_for_deletion = []
        if self.all_hands_present(ordered_expected_hands, reading['witnesses']) and self.all_share_suffix(ordered_expected_hands, reading['witnesses'], reading['suffixes']):
            #then we need to remove all the hands and replace with the siglum + suffix
            #find the lowest index, remove the hands and then at the lowest index add the siglum
            #delete from siglum at the same time to keep in line            
            index = self.get_lowest_index_of_hand(ordered_expected_hands, reading['witnesses'])
            new_hand = siglum
            new_suffix = reading['suffixes'][index]
            for hand in ordered_expected_hands:
                reading['suffixes'].pop(reading['witnesses'].index(hand))
                reading['witnesses'].remove(hand)
            reading['witnesses'].insert(index, new_hand)
            reading['suffixes'].insert(index, new_suffix)
        else:
            delete = False
            for i, hand in enumerate(ordered_expected_hands):
                if hand in reading['witnesses']:
                    if delete == True:
                        #then this is a deletion candidate
                        #print('deletion candidate %s' % hand)
                        if reading['suffixes'][reading['witnesses'].index(hand)] == reading['suffixes'][reading['witnesses'].index(ordered_expected_hands[i-1])]:
                            #print('real deletion')
                            hands_for_deletion.append(hand)
                        else:
                            pass
                            #print('no deletion')
                    else:
                        delete = True
                else:
                    delete = False
            if len(hands_for_deletion) > 0:
                pass
                #print(hands_for_deletion)
            for hand in hands_for_deletion:
                reading['suffixes'].pop(reading['witnesses'].index(hand))
                reading['witnesses'].remove(hand)
    
    def merge_sigla_and_suffixes(self, entry):
        #here you need to merge sigla and suffixes for every reading in every unit of every app line and delete the suffix list from each
        for key in entry['structure']:
            if key.find('apparatus') != -1:
                for unit in entry['structure'][key]:
                    for reading in unit['readings']:
                        reading['witnesses'] = ['%s%s' % (x, reading['suffixes'][i]) for i, x in enumerate(reading['witnesses'])]
                        del reading['suffixes']
                        if 'subreadings' in reading:
                            for type in reading['subreadings']:
                                for subreading in reading['subreadings'][type]:
                                    subreading['witnesses'] = ['%s%s' % (x, subreading['suffixes'][i]) for i, x in enumerate(subreading['witnesses'])]
                                    del subreading['suffixes']
        return

#         for entry in data:
#             hand_list = {}
#             context = entry['context']
#             vs = verses.find({'context': context, 'transcription_id': {'$in': transcription_list}, 'witnesses.1': {'$exists': True}}, ['context', 'siglum', 'witnesses'])
#             for v in vs:
#                 hand_list[v['siglum']] = [x['id'] for x in v['witnesses']]
#             print(hand_list)
            
        #for each verse
        #work out maximal number of instances of each transcription in that particular verse (should be possible from hand_id_map)
        