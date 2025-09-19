import Color from 'color';
import LayoutSelector from '@components/h5peditor-portfolio-placeholder-layout-selector.js';
import PortfolioPlaceholderPreview from '@components/preview/h5peditor-portfolio-placeholder-preview.js';
import Dictionary from '@services/dictionary.js';
import Util from '@services/util.js';
import {
  findParentLibrary, findInstance, findField,
} from '@services/util-h5p.js';

/** @constant {number} DARKEN_FACTOR Darkening factor for colors */
const DARKEN_FACTOR = 0.2;

/** Class for Portfolio Placeholder H5P widget */
export default class PortfolioPlaceholder {

  /**
   * @class
   * @param {object} parent Parent element in semantics.
   * @param {object} field Semantics field properties.
   * @param {object} params Parameters entered in editor form.
   * @param {function} setValue Callback to set parameters.
   */
  constructor(parent, field, params = {}, setValue) {
    this.parent = parent;
    this.field = field;
    this.params = Util.extend({
      colorEditorField: '#1768c4',
      arrangement: '1',
      fields: [],
    }, params);
    this.setValue = setValue;

    this.children = [];

    // Sanitize parameters
    this.params.fields = this.params.fields.map((field) => {
      field.width = field.width ?? 100;
      return field;
    });

    // Fill dictionary
    this.dictionary = new Dictionary();
    this.dictionary.fill({
      l10n: {
        done: this.t('done'),
        delete: this.t('delete'),
        expandBreadcrumb: this.t('expandBreadcrumb'),
        collapseBreadcrumb: this.t('collapseBreadcrumb'),
        confirmationDialogRemoveHeader:
          this.t('confirmationDialogRemoveHeader'),
        confirmationDialogRemoveDialog:
          this.t('confirmationDialogRemoveDialog'),
        confirmationDialogRemoveCancel:
          this.t('confirmationDialogRemoveCancel'),
        confirmationDialogRemoveConfirm:
          this.t('confirmationDialogRemoveConfirm'),
        noPreviewPossible: this.t('noPreviewPossible'),
        placeholderTitle: this.t('placeholderTitle'),
        header: this.t('header'),
        footer: this.t('footer'),
      },
      a11y: {
        sizeSliderLabel: this.t('changeContentsWidth'),
      },
    });

    this.library = `${parent.library}/${this.field.name}`;

    // Callbacks to call when parameters change
    this.changes = [];

    // Let parent handle ready callbacks of children until we're done
    this.readies = [];
    this.passReadies = true;
    this.parent.ready(() => {
      this.passReadies = false;

      this.overrideH5PCoreTitleField();

      this.overrideExtraTitle(this.parent?.field?.paramOverrides ?? {});

      if (this.parent.field?.portfolioPlaceholder?.colorSelector) {
        this.initTitleBarColor();
      }

      const chapterEditor = findParentLibrary('PortfolioChapter', this);
      if (chapterEditor) {
        chapterEditor.handlePlaceholderDone(this.parent?.params?.subContentId);
      }
    });

    // DOM, H5P may require $container
    this.$container = H5P.jQuery('<div>', {
      class: 'h5peditor-portfolio-placeholder',
    });

    // Errors (or add your own)
    this.$errors = this.$container.find('.h5p-errors');

    this.initialize();

    window.addEventListener('resize', () => {
      // Limit resizing
      clearTimeout(this.windowResizeListener);
      this.windowResizeListener = setTimeout(() => {
        this.preview.resize();
      }, 0);
    });

    // Listen for delete call
    H5P.externalDispatcher.on(
      'H5PEditor.PortfolioPlaceholder:deleteHidden', () => {
        this.preview.deleteHidden();
        this.preview.updateInstances({ force: true });
      },
    );
  }

  /**
   * Translate.
   * @param {string} key Key to get translation for.
   * @returns {string} Translation for key.
   */
  t(key) {
    return H5PEditor.t('H5PEditor.PortfolioPlaceholder', key);
  }

  /**
   * Initialize.
   */
  initialize() {
    // Instantiate original field
    this.fieldInstance = new H5PEditor.widgets[this.field.type](
      this.parent, this.field, this.params, this.setValue,
    );
    this.fieldInstance.appendTo(H5P.jQuery(document.createElement('div')));
    this.children.push(this.fieldInstance);

    // Attach color selector widget to custom dom if requested
    if (this.parent.field?.portfolioPlaceholder?.colorSelector) {
      this.colorSelectorInstance =
        findInstance('colorEditorField', this.fieldInstance);

      if (this.colorSelectorInstance) {
        this.colorSelectorInstance.appendTo(this.$container);
        this.children.push(this.colorSelectorInstance);
      }
    }

    const fieldsLayout = findField('arrangement', this.field.fields);

    // Available placeholder options can set to be subset of all options
    const availableOptions = this.buildAvailableOptions(
      {
        allOptions: fieldsLayout.options,
        defaults: PortfolioPlaceholder.DEFAULT_LAYOUTS,
        requestedOptions: this.parent?.field?.paramOverrides?.options,
      },
    );

    this.params.arrangement = this.params.arrangement ||
      fieldsLayout.default || '1';

    // Add layout selector
    this.layoutSelector = new LayoutSelector(
      {
        dictionary: this.dictionary,
        layouts: availableOptions,
      },
      {
        onLayoutChanged: ((params) => {
          if (params.reset) {
            this.resetGrowHorizonzals();
          }

          this.handleLayoutChanged(params.layout);
        }),
      },
    );
    this.$container.get(0).appendChild(this.layoutSelector.getDOM());

    // Create list widget that holds infrastructure we can use
    const listWidget = new H5PEditor.widgets.list(
      this,
      findField('fields', this.field.fields),
      this.params.fields,
      this.setValue,
    );

    // Add preview
    this.preview = new PortfolioPlaceholderPreview(
      {
        dictionary: this.dictionary,
        layout: this.params.arrangement,
        listWidget: listWidget,
      },
      {
        onChanged: (fields) => {
          this.params.fields = fields;
          this.setValue(this.field, this.params);
        },
      },
    );
    this.$container.get(0).appendChild(this.preview.getDOM());

    // Attach background color selector widget to custom dom if requested
    if (this.parent.field?.portfolioPlaceholder?.colorSelectorBackground) {
      this.colorSelectorBackgroundInstance =
        findInstance('colorBackground', this.fieldInstance);

      if (this.colorSelectorBackgroundInstance) {
        this.colorSelectorBackgroundInstance.appendTo(this.$container);
        this.children.push(this.colorSelectorBackgroundInstance);
      }
    }

    // Attach height limit text field to custom dom if requested
    if (this.parent.field?.portfolioPlaceholder?.imageHeightLimit) {
      this.imageHeightLimitInstance =
        findInstance('imageHeightLimit', this.fieldInstance);

      if (this.imageHeightLimitInstance) {
        this.imageHeightLimitInstance.appendTo(this.$container);
        this.children.push(this.imageHeightLimitInstance);
      }
    }

    if (this.params.arrangement) {
      this.layoutSelector.selectLayout(this.params.arrangement);
    }
  }

  /**
   * Append field to wrapper. Invoked by H5P core.
   * @param {H5P.jQuery} $wrapper Wrapper.
   */
  appendTo($wrapper) {
    this.$wrapper = $wrapper;
    this.$container.appendTo($wrapper);

    /*
     * Library select field is set to display: none, disables copy/paste buttons
     */
    const librarySelect = this.$container.get(0)
      .closest('.field.library')
      .querySelector('select');

    if (librarySelect) {
      librarySelect.style.display = '';
      librarySelect.style.visibility = 'hidden';
      librarySelect.style.width = '0';
      librarySelect.style.height = '1px';
    }

    /*
     * Some content types need their containers to be attached to the
     * document DOM or they will not instantiate correctly.
     */
    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].intersectionRatio === 1) {
        this.observer.unobserve(this.$container.get(0)); // Only needed once.
        this.observer.disconnect();
        this.preview.updateInstances({ force: true });
      }
    }, {
      root: document.documentElement,
      threshold: [1],
    });
    this.observer.observe(this.$container.get(0));
  }

  /**
   * Validate current values. Invoked by H5P core.
   * @returns {boolean} True, if current value is valid, else false.
   */
  validate() {
    let isValid = true;

    // Not using every - all childs' validate function needs to run
    this.children.forEach((child) => {
      isValid = isValid && (child.validate?.() ?? true);
    });

    return isValid;
  }

  /**
   * Remove self. Invoked by H5P core.
   */
  remove() {
    this.$container.remove();
  }

  /**
   * Override H5P Core title field.
   */
  overrideH5PCoreTitleField() {
    const editorContainer = this.$container.get(0)
      .closest('.h5p-portfolioplaceholder-editor');

    if (editorContainer) {
      const titleField = editorContainer
        .querySelector('.field-name-extraTitle .h5peditor-label');

      if (titleField) {
        titleField.innerHTML = this.dictionary.get('l10n.placeholderTitle');
      }

      const titleInput = editorContainer
        .querySelector('.field-name-extraTitle .h5peditor-text');

      if (titleInput) {
        titleInput.addEventListener('keydown', (event) => {
          if (event.code === 'Enter') {
            titleInput.dispatchEvent(new CustomEvent('change'));
          }
        });
      }
    }
  }

  /**
   * Override extra title.
   * @param {object} paramOverrides Parameter overrides.
   * @param {boolean} [paramOverrides.disableExtraTitleField] If true, hide extra title field.
   * @param {string} [paramOverrides.customTitleL10NId] Id of custom title.
   */
  overrideExtraTitle(paramOverrides) {
    const editorContainer = this.$container.get(0)
      .closest('.h5p-portfolioplaceholder-editor');

    if (!editorContainer) {
      return;
    }

    const extraTitle = editorContainer.querySelector('.field-name-extraTitle');
    if (!extraTitle) {
      return;
    }

    if (paramOverrides.disableExtraTitleField) {
      extraTitle.classList.add('display-none');
    }

    if (paramOverrides.customTitleL10NId) {
      const inputField = extraTitle.querySelector('input');
      if (!inputField) {
        return;
      }

      const label = this.dictionary
        .get(`l10n.${paramOverrides.customTitleL10NId}`);
      if (!label) {
        return;
      }

      inputField.value = label;
      inputField.dispatchEvent(new InputEvent('change', { data: label }));
    }
  }

  /**
   * Initialize title bar color.
   */
  initTitleBarColor() {
    if (!this.colorSelectorInstance) {
      return;
    }

    this.chapterTitleBar = this.parent.parent?.$title?.get(0)?.parentNode;
    if (!this.chapterTitleBar?.classList.contains('list-item-title-bar')) {
      this.chapterTitleBar = null;
    }

    if (this.chapterTitleBar) {
      this.chapterTitleBar
        .style.background = 'var(--title-background)';

      this.chapterTitleBar
        .style.borderColor = 'var(--title-border-color)';


      this.chapterTitleBar
        .querySelector(':scope > .h5peditor-label')
        .style.color = 'var(--title-color)';

      this.chapterTitleBar
        .querySelector('.list-actions')
        .style.color = 'var(--title-color)';

      this.chapterTitleBar
        .querySelector('.list-actions .order-group')
        .style.background = 'var(--title-background)';
    }

    this.colorSelectorInstance?.changes?.push(() => {
      // Not sure why the callback doesn't send the params directly
      this.updateEditorFieldColor();
    });

    this.updateEditorFieldColor();
  }

  /**
   * Update chapter title color in editor field.
   *
   */
  updateEditorFieldColor() {
    if (!this.colorSelectorInstance || !this.chapterTitleBar) {
      return;
    }

    // Not sure why ColorSelector changed callback doesn't send params = color
    const color = Color(this.colorSelectorInstance.params);

    this.chapterTitleBar.style.setProperty(
      '--title-background', color.hex(),
    );

    this.chapterTitleBar.style.setProperty(
      '--title-border-color', color.darken(DARKEN_FACTOR).hex(),
    );

    this.chapterTitleBar.style.setProperty(
      '--title-color',
      (color.isLight()) ? Color('black').hex() : Color('white').hex(),
    );
  }

  /**
   * Reset grow horizontals of buttons.
   */
  resetGrowHorizonzals() {
    this.params.fields = this.params.fields.map((field) => {
      field.width = 100;
      return field;
    });
  }

  /**
   * Handle layout changed.
   * @param {string} layout Layout as "1-2-3-4-...".
   */
  handleLayoutChanged(layout) {
    this.params.arrangement = layout;
    this.preview.setLayout({
      layout: layout,
      widths: this.params.fields.map((field) => field.width),
    });

    this.setValue(this.field, this.params);
    this.handleFieldChange();
  }

  /**
   * Handle change of placeholders.
   */
  handleFieldChange() {
    this.changes.forEach((change) => {
      change(this.params);
    });
  }

  /**
   * Collect functions to execute once the tree is complete.
   * @param {function} ready Function to execute.
   */
  ready(ready) {
    if (this.passReadies) {
      this.parent.ready(ready);
    }
    else {
      this.readies.push(ready);
    }
  }

  /**
   *
   * @param {object} params Parameters.
   * @returns {object} Available options.
   */
  buildAvailableOptions(params) {
    if (!params.allOptions || !params.defaults) {
      return params;
    }

    const filterOptions = params.requestedOptions ?? params.defaults;

    return params.allOptions.filter((option) => {
      return filterOptions.includes(option.value);
    });
  }
}

/** @constant {string[]} DEFAULT_LAYOUTS Default layout values. */
PortfolioPlaceholder.DEFAULT_LAYOUTS = [
  '1', '2', '1-1', '1-2', '2-1', '3', '1-3', '3-1',
];
