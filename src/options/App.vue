<!-- prettier-ignore -->
<template>
<div id="app" v-if="dataLoaded">
  <div class="section">
    <div class="option-wrap">
      <div class="option">
        <v-form-field input-id="ap"
            :label="getText('optionTitle_autoplay')">
          <v-switch id="ap" v-model="options.autoplay"></v-switch>
        </v-form-field>
      </div>
      <div class="option" v-if="!isAndroid">
        <v-form-field input-id="app"
            :label="getText('optionTitle_autoplayPlaylist')">
          <v-switch id="app" v-model="options.autoplayPlaylist"></v-switch>
        </v-form-field>
      </div>
    </div>
  </div>
</div>
</template>

<script>
import browser from 'webextension-polyfill';
import {FormField, Switch} from 'ext-components';

import storage from 'storage/storage';
import {getText, isAndroid} from 'utils/common';
import {optionKeys} from 'utils/data';

export default {
  components: {
    [FormField.name]: FormField,
    [Switch.name]: Switch
  },

  data: function() {
    return {
      dataLoaded: false,

      isAndroid: false,

      options: {
        autoplay: false,
        autoplayPlaylist: false
      }
    };
  },

  methods: {
    getText
  },

  created: async function() {
    const options = await storage.get(optionKeys, 'sync');

    for (const option of Object.keys(this.options)) {
      this.options[option] = options[option];
      this.$watch(`options.${option}`, async function(value) {
        await storage.set({[option]: value}, 'sync');
      });
    }

    document.title = getText('pageTitle', [
      getText('pageTitle_options'),
      getText('extensionName')
    ]);

    this.isAndroid = await isAndroid();

    this.dataLoaded = true;
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/typography/mixins';

body {
  min-width: 600px;
  min-height: 200px;
  @include mdc-typography-base;
  font-size: 100%;
  background-color: #ffffff;
  overflow: visible !important;
}

.mdc-switch {
  margin-right: 12px;
}

#app {
  display: grid;
  grid-row-gap: 32px;
  padding: 12px;
}

.option-wrap {
  display: grid;
  grid-row-gap: 12px;
  padding-top: 16px;
}

.option {
  display: flex;
  align-items: center;
  height: 36px;
}
</style>
