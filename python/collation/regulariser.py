#-*- coding: utf-8 -*-
import importlib

class Regulariser(object):
    
    def __init__(self, rule_conditions_config, local_python_functions):
        self.rule_conditions_config=rule_conditions_config      
        module_name = rule_conditions_config['python_file']
        class_name = rule_conditions_config['class_name']
        MyClass = getattr(importlib.import_module(module_name), class_name)
        self.instance = MyClass()       
        if local_python_functions:
            self.local_python_functions = local_python_functions
            module_name = local_python_functions['prepare_t']['python_file']
            class_name = local_python_functions['prepare_t']['class_name']
            MyClass = getattr(importlib.import_module(module_name), class_name)
            self.prepare_t_instance = MyClass()
        else:
            self.local_python_functions = None
    

    def match_tokens(self, token, decision, stage):
        decision_word = decision['t']
        token_matches = token['rule_match']
        for condition in self.rule_conditions_config['configs']:
            if 'conditions' in decision:
                if (condition['id'] in decision['conditions'].keys() \
                        and decision['conditions'][condition['id']] == True \
                        and condition['apply_when'] == True) \
                        or \
                        ((condition['id'] not in decision['conditions'].keys() \
                        or (condition['id'] in decision['conditions'].keys() and  decision['conditions'][condition['id']] == False)) \
                        and condition['apply_when'] == False):
                    if condition['type'] == 'boolean':
                        result = getattr(self.instance, condition['function'])(token, decision)
                        if result == False:
                            #if any of these don't match then we know the rule is irrelevant so we can return false already
                            return (False, None, None, None, None, None, None)
                    if condition['type'] == 'string_application':
                        decision_word, token_matches = getattr(self.instance, condition['function'])(decision_word, token_matches)
        for word in token_matches:
            if word == decision_word:            
                if stage == 'post-collate' and 'n' in token.keys():
                    #this is used so post collate rules do no override changes that were made in pre-collate rules
                    return (True, token['n'], decision['class'], decision['scope'], decision['_id'], decision['t'])
                return (True, decision['n'], decision['class'], decision['scope'], decision['_id'], decision['t'])
        return (False, None, None, None, None, None, None)


    def regularise_token(self, token, decisions, stage):
        """Check the token against the rules."""
        decision_matches = []
        for decision in decisions:
            #we are not recording subtypes anymore so we need to check here t against n
            if (self.prepare_t(decision['t']) != decision['n'] and stage == 'pre-collate') \
                    or (self.prepare_t(decision['t']) == decision['n'] and stage == 'post-collate'): 
                
                if decision['scope'] == u'always' \
                    or decision['scope'] == u'verse' \
                    or (decision['scope'] == u'manuscript' \
                        and token['reading'] == decision['context']['witness']) \
                    or (decision['scope'] == u'once' \
                        and (token['index'] == str(decision['context']['word']) \
                        and token['reading'] == decision['context']['witness'])):
                    decision_matches.append(decision)
        #order by time last modified
        if len(decision_matches) > 1:
            decision_matches.sort(key=lambda x: x['_meta']['_last_modified_time'])
            
        classes = []
        last_match = None
        matched = False
        for i, match_d in enumerate(decision_matches):
            if last_match and last_match[0] == True:
                #append the last matched n to the list of match word in the token to allow chaining
                token['rule_match'].append(last_match[1])
            match = self.match_tokens(token, match_d, stage)
            if match[0] == True:
                last_match = match
                matched = True
                classes.append({'class': match[2], 'scope': match[3], '_id': match[4], 't': match[5], 'n': match[1]})
            if i + 1 == len(decision_matches):
                if matched == True:
                    return (True, last_match[1], classes)
        return (False, None, None)    
    

    def prepare_t(self, data):
        """the result of this determines if a rule is to be applied pre- or post-collate
        It should match whatever you do to the tokens to prepare them for collation"""
        if self.local_python_functions and 'prepare_t' in self.local_python_functions:           
            return getattr(self.prepare_t_instance, self.local_python_functions['prepare_t']['function'])(data, self.settings, self.display_settings_config)
        else :
            #default is not to touch the input
            return data    
    