import './h5peditor-portfolio-placeholder-form-manager.scss';
import Util from './../h5peditor-portfolio-placeholder-util';
import Dictionary from './../services/dictionary';

export default class FormManager extends H5P.EventDispatcher {

  constructor(params = {}) {
    super();

    this.params = Util.extend({
      parent: {},
      customIconClass: ''
    }, params);

    this.formTargets = [this];

    // In theory, one could use one single manager per window
    this.manager = this;
    this.initialize();
  }

  initialize() {
    this.isMainLibrary = !(this.params.parent instanceof H5PEditor.Library);
    this.isMainLibrary = false;

    // Locate target container
    this.formContainer = (this.isMainLibrary ?
      this.params.parent.$form :
      this.params.parent.$libraryWrapper
    )[0];

    this.formContainer.classList.add('form-manager');
    this.formContainer.classList.add('root-form');

    this.head = document.createElement('div');
    this.head.classList.add('form-manager-head');
    this.footer = document.createElement('div');
    this.footer.classList.add('form-manager-head');
    this.footer.classList.add('form-manager-footer');

    // Create button to toggle preivous menu on narrow layouts
    this.breadcrumbButton = this.createButton(
      'breadcrumb-menu',
      Dictionary.get('l10n.expandBreadcrumb'),
      (() => {
        this.toggleBreadcrumbMenu();
      })
    );
    this.breadcrumbButton.classList.add('form-manager-disabled');
    this.head.appendChild(this.breadcrumbButton);

    // Create breadcrumb menu to use when the layout is too narrow for the regular breadcrumb
    this.formBreadcrumbMenu = document.createElement('div');
    this.formBreadcrumbMenu.classList.add('form-manager-breadcrumb-menulist');
    this.head.appendChild(this.formBreadcrumbMenu);

    // Create breadcrumb wrapper
    this.formBreadcrumb = document.createElement('div');
    this.formBreadcrumb.classList.add('form-manager-breadcrumb');
    this.head.appendChild(this.formBreadcrumb);

    // Create the first part of the breadcrumb
    const titles = this.createTitles(this.params.parent);
    titles.breadcrumb.classList.add('form-manager-comein');
    this.formBreadcrumb.appendChild(titles.breadcrumb);
    this.formBreadcrumbMenu.appendChild(titles.menu);

    // Create 'Proceed to save' button
    this.proceedButton = this.createButton('proceed', H5PEditor.t('core', 'proceedButtonLabel'), () => {
      if (this.manager.exitSemiFullscreen) {
        // Trigger semi-fullscreen exit
        this.manager.exitSemiFullscreen();
        this.manager.exitSemiFullscreen = null;
      }
    });
    this.hideElement(this.proceedButton);
    this.head.appendChild(this.proceedButton);

    // Create a container for the action buttons
    this.formButtons = document.createElement('div');
    this.formButtons.classList.add('form-manager-buttons');
    this.footerFormButtons = document.createElement('div');
    this.footerFormButtons.classList.add('form-manager-buttons');
    this.hideElement(this.footerFormButtons);
    this.hideElement(this.formButtons); // Buttons are hidden by default
    this.footer.appendChild(this.footerFormButtons);
    this.head.appendChild(this.formButtons);

    // Create 'Delete' button
    this.formButtons.appendChild(this.createButton(
      'delete',
      Dictionary.get('l10n.delete'),
      () => {
        this.deleteDialog.show();
      })
    );

    // Create 'Done' button
    this.formButtons.appendChild(this.createButton(
      'done',
      Dictionary.get('l10n.done'),
      () => {
        this.formTargets[this.formTargets.length - 1]
          .trigger('formdone', this.formTargets.length);
        if (this.formTargets.length > 1) {
          this.closeForm();
        }
      })
    );

    // Footer form buttons
    this.footerFormButtons.appendChild(this.createButton(
      'done',
      Dictionary.get('l10n.done'),
      () => {
        this.formTargets[this.formTargets.length - 1]
          .trigger('formdone', this.formTargets.length);
        if (this.formTargets.length > 1) {
          this.closeForm();
        }
      })
    );

    this.footerFormButtons.appendChild(this.createButton(
      'delete',
      Dictionary.get('l10n.delete'),
      () => {
        this.deleteDialog.show();
      })
    );

    // Check if we should add the fullscreen button
    if (this.isMainLibrary && H5PEditor.semiFullscreen !== undefined) {
      // Create and insert fullscreen button into header
      const fullscreenButton = this.createButton('fullscreen', '', () => {
        if (this.manager.exitSemiFullscreen) {
          // Trigger semi-fullscreen exit
          this.manager.exitSemiFullscreen();
        }
        else {
          // Trigger semi-fullscreen enter
          this.manager.exitSemiFullscreen = H5PEditor.semiFullscreen([this.manager.formContainer], () => {
            if (!this.subForm) {
              this.showElement(this.proceedButton);
            }
            this.toggleFullscreenButtonState(fullscreenButton, true);
            this.trigger('formentersemifullscreen');
          }, () => {
            this.manager.exitSemiFullscreen = null;
            if (!this.subForm) {
              this.hideElement(this.proceedButton);
            }
            this.toggleFullscreenButtonState(fullscreenButton);
            this.trigger('formexitsemifullscreen');
          });
        }
      });
      this.toggleFullscreenButtonState(fullscreenButton);
      this.head.appendChild(fullscreenButton);
    }

    window.addEventListener('resize', () => {
      this.updateFormResponsiveness();
    });

    // Always clean up on remove
    this.on('remove', () => {
      window.removeEventListener('resize', () => {
        this.updateFormResponsiveness();
      });
    });

    const overlay = document.createElement('div');
    overlay.classList.add('form-mananger-overlay');
    this.formContainer.insertBefore(overlay, this.formContainer.firstChild);

    // Insert everything in the top of the form DOM
    this.formContainer.insertBefore(this.head, this.formContainer.firstChild);
    this.hideElement(this.footer);
    this.formContainer.appendChild(this.manager.footer);

    // Always clean up on remove
    this.on('validate', () => {
      if (this.params.parent.metadata && (!this.params.parent.metadata.title || !H5P.trim(this.params.parent.metadata.title))) {
        // We are trying to save the form without a title
        this.closeFormUntil(0);
      }
    });

    this.deleteDialog = new H5P.ConfirmationDialog({
      headerText: Dictionary.get('l10n.confirmationDialogRemoveHeader'),
      dialogText: Dictionary.get('l10n.confirmationDialogRemoveDialog'),
      cancelText: Dictionary.get('l10n.confirmationDialogRemoveCancel'),
      confirmText: Dictionary.get('l10n.confirmationDialogRemoveConfirm')
    });
    this.deleteDialog.on('confirmed', () => {
      this.handleRemoved();
    });
    this.deleteDialog.appendTo(document.body);
  }

  /**
   * Helper for creating buttons.
   *
   * @private
   * @param {string} id Id.
   * @param {string} text Text.
   * @param {function} clickHandler Click handler.
   * @returns {HTMLElement} Button.
   */
  createButton(id, text, clickHandler) {
    const button = document.createElement('button');
    button.setAttribute('type', 'button');
    button.classList.add('form-manager-button');
    button.classList.add('form-manager-' + id);
    button.setAttribute('aria-label', text);
    button.addEventListener('click', clickHandler);

    // Create special inner filler to avoid focus from pointer devices.
    const content = document.createElement('span');
    content.classList.add('form-manager-button-inner');
    content.innerText = text;
    content.tabIndex = -1;
    button.appendChild(content);

    return button;
  }

  /**
   * Create two titles, one for the breadcrumb and for the expanded breadcrumb menu used for narrow layouts.
   *
   * @param {H5PEditor.Library} libraryField Library field.
   * @param {string} customTitle Custom title.
   * @param {string} customIconId Custom icon id.
   * @returns {object[]} Element.
   */
  createTitles(libraryField, customTitle, customIconId) {

    const library = (libraryField.params && libraryField.params.library) ? libraryField.params.library : (libraryField.currentLibrary ? libraryField.currentLibrary : undefined);

    // Create breadcrumb section.
    const title = document.createElement('div');
    title.classList.add('form-manager-title');

    // Create breadcrumb section.
    const menuTitle = document.createElement('div');
    menuTitle.classList.add('form-manager-menutitle');
    menuTitle.tabIndex = '0';
    menuTitle.addEventListener('click', () => {
      this.handleBreadcrumbClick(title);
    });
    menuTitle.addEventListener('keypress', (e) => {
      this.handleBreadcrumbKeypress(e, title);
    });

    // For limiting the length of the menu title
    const menuTitleText = document.createElement('span');
    menuTitleText.classList.add('form-manager-menutitle-text');
    menuTitle.appendChild(menuTitleText);

    // Create a tooltip that can be display the whole text on hover
    const menuTitleTooltip = document.createElement('span');
    menuTitleTooltip.classList.add('form-manager-tooltip');
    menuTitle.appendChild(menuTitleTooltip);

    // Create a text wrapper so we can limit max-width on the text
    const textWrapper = document.createElement('span');
    textWrapper.classList.add('truncatable-text');
    textWrapper.tabIndex = -1;
    title.appendChild(textWrapper);

    // Create a tooltip that can display the whole text on hover
    const tooltip = document.createElement('span');
    tooltip.classList.add('form-manager-tooltip');
    title.appendChild(tooltip);

    /**
     * @private
     * @param {string} title WARNING: This is Text do not use as HTML.
     */
    const setTitle = (title) => {
      textWrapper.innerText = menuTitleText.innerText = tooltip.innerText = menuTitleTooltip.innerText = title;
    };

    /**
     * @private
     * @returns {string} WARNING: This is Text do not use as HTML.
     */
    const getTitle = () => {
      if (customTitle) {
        return customTitle;
      }
      else if (libraryField.params && libraryField.params.metadata && libraryField.params.metadata.title &&
          libraryField.params.metadata.title.substring(0, 8) !== 'Untitled' ||
          libraryField.metadata && libraryField.metadata.title &&
          libraryField.metadata.title.substring(0, 8) !== 'Untitled') {
        return this.getText(libraryField.metadata ? libraryField.metadata.title : libraryField.params.metadata.title);
      }
      else {
        if (libraryField.$select !== undefined && libraryField.$select.children(':selected').text() !== '-') {
          return libraryField.$select.children(':selected').text();
        }
        else {
          return H5PEditor.libraryCache[library].title;
        }
      }
    };

    // Set correct starting title
    setTitle(getTitle());

    /**
     * Help listen for title changes after library has been fully loaded.
     *
     * @private
     */
    const listenForTitleChanges = () => {
      if (libraryField.metadataForm) {
        libraryField.metadataForm.on('titlechange', () => {
          // Handle changes to the metadata title
          setTitle(getTitle());
          this.manager.updateFormResponsiveness();
        });
      }

      if (textWrapper.innerText === 'Loading...') {
        // Correct title was not set initally, try again after library load
        setTitle(getTitle());
        this.manager.updateFormResponsiveness();
      }

      if (this.subForm) {
        const librarySelectField = this.subForm.querySelector('.field.library select');
        if (librarySelectField) {
          librarySelectField.addEventListener('change', (event) => {
            const title = event.target.options[event.target.selectedIndex].text;
            setTitle(title);
            this.manager.updateFormResponsiveness();
          });
        }
      }
    };

    // Listen for title updates
    if (libraryField.metadataForm === undefined && libraryField.change) {
      libraryField.change(listenForTitleChanges);
    }
    else {
      listenForTitleChanges();
    }

    const iconId = customIconId ? customIconId : library.split(' ')[0].split('.')[1].toLowerCase();
    title.classList.add('form-manager-icon-' + iconId);
    menuTitle.classList.add('form-manager-icon-' + iconId);
    if (this.params.customIconClass) {
      title.classList.add('form-manager-' + this.params.customIconClass);
      menuTitle.classList.add('form-manager-' + this.params.customIconClass);
    }

    return {
      breadcrumb: title,
      menu: menuTitle
    };
  }

  /**
   * Help hide an element.
   *
   * @param {HTMLElement} element Element to hide.
   * @private
   */
  hideElement(element) {
    // Make sure element is hidden while still retaining its width without
    // expanding the container's height. This is due to some editors resizing
    // if their container changes size which leads to some funny transitions.
    // Also, having invisible height causes resize loops.
    element.classList.add('form-manager-hidden');
    element.setAttribute('aria-hidden', true);
  }

  /**
   * Help show a hidden element again.
   *
   * @param {HTMLElement} element Element to show.
   * @private
   */
  showElement(element) {
    element.classList.remove('form-manager-hidden');
    element.removeAttribute('aria-hidden');
  }

  /**
   * Update fuillscreen button's attributes dependent on fullscreen or not.
   *
   * @param {HTMLElement} element The fullscreen button element.
   * @param {boolean} isInFullscreen If true, is in fullscreen mode.
   */
  toggleFullscreenButtonState(element, isInFullscreen) {
    if (isInFullscreen) {
      // We are entering fullscreen mode
      element.setAttribute('aria-label', H5PEditor.t('core', 'exitFullscreenButtonLabel'));
      element.classList.add('form-manager-exit');
    }
    else {
      // We are exiting fullscreen mode
      element.setAttribute('aria-label', H5PEditor.t('core', 'enterFullscreenButtonLabel'));
      element.classList.remove('form-manager-exit');
    }
  }

  /**
   * Closes the current form.
   */
  closeForm() {
    const activeManager = this.formTargets.pop();

    // Close any open CKEditors
    if (H5PEditor.Html) {
      H5PEditor.Html.removeWysiwyg();
    }

    // Let everyone know we're closing
    activeManager.trigger('formclose');

    // Locate open form and remove it from the manager
    const activeSubForm = activeManager.popForm();

    if (this.handleTransitionend) {
      // Cancel callback for form if not fully opened.
      activeSubForm.removeEventListener('transitionend', () => {
        this.handleTransitionend();
      });
      this.handleTransitionend = null;
    }

    // Find last part of breadcrumb and remove it from the manager
    const titles = activeManager.popTitles();

    // Remove menu title
    this.manager.formBreadcrumbMenu.removeChild(titles.menu);

    // The previous breadcrumb must no longer be clickable
    const previousBreadcrumb = titles.breadcrumb.previousSibling;
    previousBreadcrumb.removeEventListener('click', () => {
      this.handleBreadcrumbClick(previousBreadcrumb);
    });
    previousBreadcrumb.removeEventListener('keypress', (e) => {
      this.handleBreadcrumbKeypress(e, previousBreadcrumb);
    });
    previousBreadcrumb.classList.remove('clickable');
    previousBreadcrumb.removeAttribute('tabindex');

    const headHeight = this.manager.getFormHeadHeight();

    // Freeze container height to avoid jumping while showing elements
    this.manager.formContainer.style.height = (activeSubForm.getBoundingClientRect().height + headHeight) + 'px';

    // Make underlay visible again
    if (activeSubForm.previousSibling.classList.contains('form-manager-form')) {
      // This is not our last sub-form
      this.showElement(activeSubForm.previousSibling);
    }
    else {
      // Show bottom form
      for (let i = 1; i < this.manager.formContainer.children.length - 1; i++) {
        this.showElement(this.manager.formContainer.children[i]);
      }

      // No need for the buttons any more
      if (!this.alwaysShowButtons) {
        this.hideElement(this.manager.formButtons);
        this.manager.formButtons.classList.remove('form-manager-comein');

        // Hide footer
        this.manager.footerFormButtons.classList.remove('form-manager-comein');
        this.hideElement(this.manager.footerFormButtons);
        this.hideElement(this.manager.footer);
      }

      this.manager.formContainer.classList.add('root-form');
    }

    // Animation fix for fullscreen max-width limit.
    activeSubForm.style.marginLeft = window.getComputedStyle(activeSubForm).marginLeft;

    // Make the sub-form animatable
    activeSubForm.classList.add('form-manager-movable');

    // Resume natural container height
    this.manager.formContainer.style.height = '';

    // Set sub-form height to cover container
    activeSubForm.style.height = (this.manager.formContainer.getBoundingClientRect().height - headHeight) + 'px';

    // Clean up when the final transition animation is finished
    this.onlyOnce(activeSubForm, 'transitionend', () => {
      // Remove from DOM
      this.manager.formContainer.removeChild(activeSubForm);
    });
    // Start the animation
    activeSubForm.classList.remove('form-manager-slidein');

    if (titles.breadcrumb.offsetWidth === 0) {
      // Remove last breadcrumb section in case it's hidden
      this.manager.formBreadcrumb.removeChild(titles.breadcrumb);
    }
    else {
      this.onlyOnce(titles.breadcrumb, 'transitionend', () => {
        // Remove last breadcrumb section
        this.manager.formBreadcrumb.removeChild(titles.breadcrumb);
      });
      // Start the animation
      titles.breadcrumb.classList.remove('form-manager-comein');
    }

    if (!this.subForm) {
      if (this.proceedButton && this.manager.exitSemiFullscreen) {
        // We are in fullscreen and closing sub-form, show proceed button
        this.showElement(this.proceedButton);
      }
      if (this.breadcrumbButton) {
        this.breadcrumbButton.classList.add('form-manager-disabled');
      }
    }
    if (this.formContainer.classList.contains('mobile-menu-open')) {
      this.toggleBreadcrumbMenu();
    }

    // Scroll parent manager header into view
    this.manager.formButtons.scrollIntoView();
  }

  /**
   * The breadcrumb click handler figures out how many forms to close.
   *
   * @param {HTMLElement} target Element that was clicked on.
   * @private
   */
  handleBreadcrumbClick(target) {
    target = target || this;
    for (let i = 0; i < this.manager.formBreadcrumb.children.length; i++) {
      if (this.manager.formBreadcrumb.children[i] === target) {
        this.manager.closeFormUntil(i);
        break;
      }
    }
  }

  /**
   * The breadcrumb click handler figures out how many forms to close.
   *
   * @param {Event} e Event.
   * @param {string} title Title.
   * @private
   */
  handleBreadcrumbKeypress(e, title) {
    if (e.which === 13 || e.which === 32) {
      this.handleBreadcrumbClick(title);
    }
  }

  /**
   * Close all forms until the given index.
   *
   * @param {number} index Index.
   */
  closeFormUntil(index) {
    while (this.formTargets.length - 1 !== index) {
      this.formTargets[this.formTargets.length - 1].trigger('formdone');
      this.closeForm();
    }
  }

  /**
   * Retrieve the current form element and remove it from the manager.
   *
   * @returns {HTMLElement} Form element.
   */
  popForm() {
    const sF = this.subForm;
    this.subForm = null;
    return sF;
  }

  /**
   * Retrieve the current title element and remove it from the manager.
   *
   * @returns {object[]} Title.
   */
  popTitles() {
    const t = this.titles;
    this.titles = null;
    return t;
  }

  /**
   * Retrieve the active manager.
   *
   * @returns {FormManager} Form manager.
   */
  getFormManager() {
    return this.manager;
  }

  /**
   * Set the form manager to be used for the next button clicks.
   *
   * @param {FormManager} target Target.
   */
  addFormTarget(target) {
    this.formTargets.push(target);
  }

  /**
   * Create a new sub-form and shows it.
   *
   * @param {H5PEditor.Library} libraryField Library field.
   * @param {HTMLElement} formElement Form element.
   * @param {string} customClass Custom class name.
   * @param {string} customTitle Custom title.
   * @param {string} customIconId Custom icon id.
   */
  openForm(libraryField, formElement, customClass, customTitle, customIconId) {
    if (this.subForm) {
      return; // Prevent opening more than one sub-form at a time per editor.
    }

    // Tell manager that we should be receiving the next buttons events
    this.manager.formContainer.classList.remove('root-form');
    this.manager.addFormTarget(this);

    // Create the new sub-form
    this.subForm = document.createElement('div');
    this.subForm.classList.add('form-manager-form');
    this.subForm.classList.add('form-manager-movable');
    if (customClass) {
      this.subForm.classList.add(customClass);
    }
    this.subForm.appendChild(formElement);

    // Ensure same height as container
    this.subForm.style.height = (this.manager.formContainer.getBoundingClientRect().height - this.manager.getFormHeadHeight()) + 'px';

    // Insert into DOM
    this.manager.formContainer.appendChild(this.subForm);

    // Make last part of breadcrumb clickable
    const lastBreadcrumb = this.manager.formBreadcrumb.lastChild;
    lastBreadcrumb.addEventListener('click', () => {
      this.handleBreadcrumbClick(lastBreadcrumb);
    });
    lastBreadcrumb.addEventListener('keypress', (e) => {
      this.handleBreadcrumbKeypress(e, lastBreadcrumb);
    });
    lastBreadcrumb.classList.add('clickable');
    lastBreadcrumb.tabIndex = '0';

    // Add breadcrumb section
    this.titles = this.createTitles(libraryField, customTitle, customIconId);
    this.manager.formBreadcrumb.appendChild(this.titles.breadcrumb);
    this.manager.formBreadcrumbMenu.insertBefore(this.titles.menu, this.manager.formBreadcrumbMenu.firstChild);

    // Show our buttons
    this.showElement(this.manager.formButtons);
    this.showElement(this.manager.footerFormButtons);
    this.showElement(this.manager.footer);

    // Ensure footer is at the bottom of the form
    this.manager.formContainer.appendChild(this.manager.footer);

    // When transition animation is done and the form is fully open...
    this.handleTransitionend = this.onlyOnce(this.subForm, 'transitionend', () => {
      this.handleTransitionend = null;

      // Hide everything except first, second, last child and footer
      for (let i = 2; i < this.manager.formContainer.children.length - 1; i++) {
        const child = this.manager.formContainer.children[i];
        const skipHiding = child === this.subForm
          || child.classList.contains('sp-container')
          || child.classList.contains('form-manager-footer');
        if (!skipHiding) {
          this.hideElement(this.manager.formContainer.children[i]);
        }
      }

      // Resume natural height
      this.subForm.style.height = '';
      this.subForm.style.marginLeft = '';
      this.subForm.classList.remove('form-manager-movable');

      const focusField = this.subForm.querySelector('.field');
      if (focusField) {
        focusField.focus();
      }

      this.trigger('formopened');
    });

    // Start animation on the next tick
    setTimeout(() => {
      // Animation fix for fullscreen max-width limit.
      this.subForm.style.marginLeft = (parseFloat(window.getComputedStyle(this.manager.formContainer.children[this.manager.formContainer.children.length - 2]).marginLeft) - 20) + 'px';

      this.subForm.classList.add('form-manager-slidein');
      this.titles.breadcrumb.classList.add('form-manager-comein');
      this.manager.formButtons.classList.add('form-manager-comein');
      this.manager.footerFormButtons.classList.add('form-manager-comein');
      this.manager.updateFormResponsiveness();
    }, 0);

    if (this.proceedButton && this.manager.exitSemiFullscreen) {
      // We are in fullscreen and opening sub-form, hide Proceed button
      this.hideElement(this.proceedButton);
    }
    if (this.breadcrumbButton) {
      this.breadcrumbButton.classList.remove('form-manager-disabled');
    }
  }

  /**
   * Check if the sub-form is fully opened. (animation finished)
   *
   * @returns {boolean} True if sub-form is fully opened.
   */
  isFormOpen() {
    return this.subForm && !this.handleTransitionend;
  }

  /**
   * Determine the overall height of the form head section.
   *
   * @returns {number} Height.
   */
  getFormHeadHeight() {
    return (this.alwaysShowButtons ?
      0 :
      this.head.getBoundingClientRect().height
    );
  }

  /**
   * Toggle the breadcrumb menu.
   */
  toggleBreadcrumbMenu() {
    if (this.formContainer.classList.contains('mobile-menu-open')) {
      // Close breadcrumb menu
      this.formContainer.classList.remove('mobile-menu-open');
      this.breadcrumbButton.children[0].innerText = Dictionary.get('l10n.expandBreadcrumbButtonLabel');
      this.breadcrumbButton.setAttribute('aria-label', Dictionary.get('l10n.expandBreadcrumbButtonLabel'));
      this.formBreadcrumbMenu.classList.remove('form-manager-comein');
    }
    else {
      // Open breadcrumb menu
      this.formContainer.classList.add('mobile-menu-open');
      this.breadcrumbButton.children[0].innerText = Dictionary.get('l10n.collapseBreadcrumbButtonLabel');
      this.breadcrumbButton.setAttribute('aria-label', Dictionary.get('l10n.collapseBreadcrumbButtonLabel'));
      this.formBreadcrumbMenu.classList.add('form-manager-comein');
    }
  }

  /**
   * Resize form header elements to fit better inside narrow forms.
   */
  updateFormResponsiveness() {
    if (this.head.classList.contains('mobile-view-large')) {
      this.head.classList.remove('mobile-view-large');
    }
    if (this.formContainer.classList.contains('mobile-view-small')) {
      this.formContainer.classList.remove('mobile-view-small');
    }
    if (this.head.offsetWidth < 481) {
      this.formContainer.classList.add('mobile-view-small');
    }

    /**
     * Enable tooltips where we have text-ellipsis.
     *
     * @private
     * @param {HTMLElement} element Element.
     * @returns {boolean} True if tooltip is active.
     */
    const updateActiveTooltips = (element) => {
      let tooltipActive;
      for (let i = 0; i < element.children.length; i++) {
        const breadcrumbTitle = element.children[i];
        if (breadcrumbTitle.firstChild.offsetWidth && breadcrumbTitle.firstChild.scrollWidth > breadcrumbTitle.firstChild.offsetWidth + 1) {
          breadcrumbTitle.classList.add('form-mananger-tooltip-active');
          tooltipActive = true;
        }
        else {
          breadcrumbTitle.classList.remove('form-mananger-tooltip-active');
        }
      }
      return tooltipActive;
    };

    if (updateActiveTooltips(this.formBreadcrumb)) {
      this.head.classList.add('mobile-view-large');
      // Check again since we made buttons smaller
      updateActiveTooltips(this.formBreadcrumb);
    }
    updateActiveTooltips(this.formBreadcrumbMenu);
  }

  /**
   * Keep the buttons visible even though the last sub-form is closed.
   *
   * @param {boolean} state State.
   */
  setAlwaysShowButtons(state) {
    this.alwaysShowButtons = state;

    if (this.alwaysShowButtons) {
      // Show our buttons
      this.showElement(this.manager.formButtons);
      this.manager.formButtons.classList.add('form-manager-comein');
    }
  }

  /**
   * Help convert any HTML into text.
   *
   * @param {string} value HTML.
   * @returns {string} Text.
   */
  getText(value) {
    const textNode = H5PEditor.$.parseHTML(value);
    if (textNode !== null) {
      return textNode[0].nodeValue;
    }
    return value;
  }

  /**
   * Help make sure that an event handler is only triggered once.
   *
   * @param {HTMLElement} element Element.
   * @param {string} eventName Event name.
   * @param {function} handler Handler.
   * @returns {function} Callback in case of manual cancellation.
   */
  onlyOnce(element, eventName, handler) {
    const callback = () => {
      // Make sure we're only called once.
      element.removeEventListener(eventName, callback);

      // Trigger the real handler
      handler.apply(this, arguments);
    };
    element.addEventListener(eventName, callback);
    return callback;
  }

  /**
   * Handle removed.
   */
  handleRemoved() {
    const e = new H5P.Event('formremove');
    e.data = this.formTargets.length;
    this.formTargets[this.formTargets.length - 1].trigger(e);
    if (!e.preventRemove && this.formTargets.length > 1) {
      this.closeForm();
    }
  }
}
