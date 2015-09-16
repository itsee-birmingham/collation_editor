#-*- coding: utf-8 -*-

class RuleConditions(object):
    
    def match_nomsac(self, token, decision):
        if 'only_nomsac' in decision['conditions'].keys() and decision['conditions']['only_nomsac'] == True \
            and ('nomSac' not in token.keys() or token['nomSac'] == False):
            return False
        return True
        
    def ignore_unclear(self, decision_word, token_words):
        decision_word = decision_word.replace('_', '')
        token_words = [w.replace('_', '') for w in token_words]
        return(decision_word, token_words) 
        
    def ignore_supplied(self, decision_word, token_words):
        decision_word = decision_word.replace('[', '').replace(']', '')
        token_words = [w.replace('[', '').replace(']', '') for w in token_words]
        return(decision_word, token_words)  

class PrepareData(object):
    
    def prepare_t(self, string, display_settings={}, display_settings_config=[]):
        #turn it into a dictionary so we can use other functions 
        settingsApplier = ApplySettings()
        token = {'interface': string}
        token = settingsApplier.lower_case_greek(token)
        token = settingsApplier.hide_supplied_text(token)
        token = settingsApplier.hide_unclear_text(token)
        token = settingsApplier.hide_apostrophes(token)
        token = settingsApplier.hide_diaeresis(token)
        return token['interface']
        
        
    def set_rule_string(self, token, display_settings={}, display_settings_config=[]):        
        if 'n' in token:
            word = token['n']    
        elif 'expand_abbreviations' in display_settings and 'expanded' in token.keys():
            word = token['expanded']
        else:
            word = token['original']  
        temp_token = {'interface': word}
        settingsApplier = ApplySettings()
        temp_token = settingsApplier.lower_case_greek(temp_token)
        temp_token = settingsApplier.hide_apostrophes(temp_token)
        temp_token = settingsApplier.hide_diaeresis(temp_token)
        token['rule_string'] = temp_token['interface']
        return token


class ApplySettings(object):
  
    def select_lemma(self, token):
        if 'lemma' in token:
            token['interface'] = token['lemma']
        return token
    
    def expand_abbreviations(self, token):
        if 'expanded' in token:
            token['interface'] = token['expanded']
        return token
    
    def lower_case_greek(self, token):
        if len(token['interface']) > 0:
            newchars = []
            for char in token['interface']:
                newchars.append(char.lower())
            if newchars[-1] == u'σ':
                newchars[-1] = u'ς'
            token['interface'] = ''.join(newchars)
            return token
        else:
            return token
        
    def hide_supplied_text(self, token):
        token['interface'] = token['interface'].replace('[', '').replace(']', '')
        return token       
    
    def hide_unclear_text(self, token):
        token['interface'] = token['interface'].replace('_', '')
        return token
       
    def hide_apostrophes(self, token):
        token['interface'] = token['interface'].replace(u'’', '').replace(u'\'', '')
        return token
    
    def hide_diaeresis(self, token):
        token['interface'] = token['interface'].replace(u'ϊ', u'ι').replace(u'ϊ', u'ι').replace(u'ϋ', u'υ').replace(u'ϋ', u'υ')
        return token
    
    def show_punctuation(self, token):
        if 'pc_before' in token:
            token['interface'] = '%s%s' % (token['pc_before'],token['interface'])
        if 'pc_after' in token:
            token['interface'] = '%s%s' % (token['interface'], token['pc_after'])
        return token
