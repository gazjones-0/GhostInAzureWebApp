'use strict';

define("ghost-admin/tests/acceptance/authentication-test", ["ember-cli-mirage/test-support/setup-mirage", "ghost-admin/utils/window-proxy", "ember-cli-mirage", "mocha", "ember-simple-auth/test-support", "@ember/test-helpers", "chai", "ember-mocha"], function (_setupMirage, _windowProxy, _emberCliMirage, _mocha, _testSupport, _testHelpers, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Authentication', function () {
    let originalReplaceLocation;
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.describe)('setup redirect', function () {
      (0, _mocha.beforeEach)(function () {
        // ensure the /users/me route doesn't error
        this.server.create('user');
        this.server.get('authentication/setup', function () {
          return {
            setup: [{
              status: false
            }]
          };
        });
      });
      (0, _mocha.it)('redirects to setup when setup isn\'t complete', async function () {
        await (0, _testHelpers.visit)('settings/labs');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/setup/one');
      });
    });
    (0, _mocha.describe)('general page', function () {
      let newLocation;
      (0, _mocha.beforeEach)(function () {
        originalReplaceLocation = _windowProxy.default.replaceLocation;

        _windowProxy.default.replaceLocation = function (url) {
          url = url.replace(/^\/ghost\//, '/');
          newLocation = url;
        };

        newLocation = undefined;
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role],
          slug: 'test-user'
        });
      });
      (0, _mocha.afterEach)(function () {
        _windowProxy.default.replaceLocation = originalReplaceLocation;
      });
      (0, _mocha.it)('invalidates session on 401 API response', async function () {
        // return a 401 when attempting to retrieve users
        this.server.get('/users/', () => new _emberCliMirage.Response(401, {}, {
          errors: [{
            message: 'Access denied.',
            type: 'UnauthorizedError'
          }]
        }));
        await (0, _testSupport.authenticateSession)();
        await (0, _testHelpers.visit)('/staff'); // running `visit(url)` inside windowProxy.replaceLocation breaks
        // the async behaviour so we need to run `visit` here to simulate
        // the browser visiting the new page

        if (newLocation) {
          await (0, _testHelpers.visit)(newLocation);
        }

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after 401').to.equal('/signin');
      });
      (0, _mocha.it)('doesn\'t show navigation menu on invalid url when not authenticated', async function () {
        await (0, _testSupport.invalidateSession)();
        await (0, _testHelpers.visit)('/');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'current url').to.equal('/signin');
        (0, _chai.expect)((0, _testHelpers.findAll)('nav.gh-nav').length, 'nav menu presence').to.equal(0);
        await (0, _testHelpers.visit)('/signin/invalidurl/');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after invalid url').to.equal('/signin/invalidurl/');
        (0, _chai.expect)((0, _testHelpers.currentRouteName)(), 'path after invalid url').to.equal('error404');
        (0, _chai.expect)((0, _testHelpers.findAll)('nav.gh-nav').length, 'nav menu presence').to.equal(0);
      });
      (0, _mocha.it)('shows nav menu on invalid url when authenticated', async function () {
        await (0, _testSupport.authenticateSession)();
        await (0, _testHelpers.visit)('/signin/invalidurl/');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after invalid url').to.equal('/signin/invalidurl/');
        (0, _chai.expect)((0, _testHelpers.currentRouteName)(), 'path after invalid url').to.equal('error404');
        (0, _chai.expect)((0, _testHelpers.findAll)('nav.gh-nav').length, 'nav menu presence').to.equal(1);
      });
    }); // TODO: re-enable once modal reappears correctly

    _mocha.describe.skip('editor', function () {
      let origDebounce = Ember.run.debounce;
      let origThrottle = Ember.run.throttle; // we don't want the autosave interfering in this test

      (0, _mocha.beforeEach)(function () {
        Ember.run.debounce = function () {};

        Ember.run.throttle = function () {};
      });
      (0, _mocha.it)('displays re-auth modal attempting to save with invalid session', async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        }); // simulate an invalid session when saving the edited post

        this.server.put('/posts/:id/', function (_ref, _ref2) {
          let posts = _ref.posts;
          let params = _ref2.params;
          let post = posts.find(params.id);
          let attrs = this.normalizedRequestAttrs();

          if (attrs.mobiledoc.cards[0][1].markdown === 'Edited post body') {
            return new _emberCliMirage.Response(401, {}, {
              errors: [{
                message: 'Access denied.',
                type: 'UnauthorizedError'
              }]
            });
          } else {
            return post.update(attrs);
          }
        });
        await (0, _testSupport.authenticateSession)();
        await (0, _testHelpers.visit)('/editor'); // create the post

        await (0, _testHelpers.fillIn)('#entry-title', 'Test Post');
        await (0, _testHelpers.fillIn)('.__mobiledoc-editor', 'Test post body');
        await (0, _testHelpers.click)('.js-publish-button'); // we shouldn't have a modal at this point

        (0, _chai.expect)((0, _testHelpers.findAll)('.modal-container #login').length, 'modal exists').to.equal(0); // we also shouldn't have any alerts

        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length, 'no of alerts').to.equal(0); // update the post

        await (0, _testHelpers.fillIn)('.__mobiledoc-editor', 'Edited post body');
        await (0, _testHelpers.click)('.js-publish-button'); // we should see a re-auth modal

        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal #login').length, 'modal exists').to.equal(1);
      }); // don't clobber debounce/throttle for future tests

      (0, _mocha.afterEach)(function () {
        Ember.run.debounce = origDebounce;
        Ember.run.throttle = origThrottle;
      });
    });
  });
});
define("ghost-admin/tests/acceptance/content-test", ["ember-cli-mirage/test-support/setup-mirage", "ember-simple-auth/test-support", "mocha", "ember-power-select/test-support/helpers", "@ember/test-helpers", "chai", "ember-mocha"], function (_setupMirage, _testSupport, _mocha, _helpers, _testHelpers, _chai, _emberMocha) {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  (0, _mocha.describe)('Acceptance: Content', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _testHelpers.visit)('/posts');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/signin');
    });
    (0, _mocha.describe)('as admin', function () {
      let admin, editor, publishedPost, scheduledPost, draftPost, authorPost;
      (0, _mocha.beforeEach)(async function () {
        let adminRole = this.server.create('role', {
          name: 'Administrator'
        });
        admin = this.server.create('user', {
          roles: [adminRole]
        });
        let editorRole = this.server.create('role', {
          name: 'Editor'
        });
        editor = this.server.create('user', {
          roles: [editorRole]
        });
        publishedPost = this.server.create('post', {
          authors: [admin],
          status: 'published',
          title: 'Published Post'
        });
        scheduledPost = this.server.create('post', {
          authors: [admin],
          status: 'scheduled',
          title: 'Scheduled Post'
        });
        draftPost = this.server.create('post', {
          authors: [admin],
          status: 'draft',
          title: 'Draft Post'
        });
        authorPost = this.server.create('post', {
          authors: [editor],
          status: 'published',
          title: 'Editor Published Post'
        }); // pages shouldn't appear in the list

        this.server.create('page', {
          authors: [admin],
          status: 'published',
          title: 'Published Page'
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('displays and filters posts', async function () {
        await (0, _testHelpers.visit)('/posts'); // Not checking request here as it won't be the last request made
        // Displays all posts + pages

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-post-id]').length, 'all posts count').to.equal(4); // show draft posts

        await (0, _helpers.selectChoose)('[data-test-type-select]', 'Draft posts'); // API request is correct

        let _this$server$pretende = this.server.pretender.handledRequests.slice(-1),
            _this$server$pretende2 = _slicedToArray(_this$server$pretende, 1),
            lastRequest = _this$server$pretende2[0];

        (0, _chai.expect)(lastRequest.queryParams.filter, '"drafts" request status filter').to.have.string('status:draft'); // Displays draft post

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-post-id]').length, 'drafts count').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)("[data-test-post-id=\"".concat(draftPost.id, "\"]")), 'draft post').to.exist; // show published posts

        await (0, _helpers.selectChoose)('[data-test-type-select]', 'Published posts'); // API request is correct

        var _this$server$pretende3 = this.server.pretender.handledRequests.slice(-1);

        var _this$server$pretende4 = _slicedToArray(_this$server$pretende3, 1);

        lastRequest = _this$server$pretende4[0];
        (0, _chai.expect)(lastRequest.queryParams.filter, '"published" request status filter').to.have.string('status:published'); // Displays three published posts + pages

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-post-id]').length, 'published count').to.equal(2);
        (0, _chai.expect)((0, _testHelpers.find)("[data-test-post-id=\"".concat(publishedPost.id, "\"]")), 'admin published post').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)("[data-test-post-id=\"".concat(authorPost.id, "\"]")), 'author published post').to.exist; // show scheduled posts

        await (0, _helpers.selectChoose)('[data-test-type-select]', 'Scheduled posts'); // API request is correct

        var _this$server$pretende5 = this.server.pretender.handledRequests.slice(-1);

        var _this$server$pretende6 = _slicedToArray(_this$server$pretende5, 1);

        lastRequest = _this$server$pretende6[0];
        (0, _chai.expect)(lastRequest.queryParams.filter, '"scheduled" request status filter').to.have.string('status:scheduled'); // Displays scheduled post

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-post-id]').length, 'scheduled count').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)("[data-test-post-id=\"".concat(scheduledPost.id, "\"]")), 'scheduled post').to.exist; // show all posts

        await (0, _helpers.selectChoose)('[data-test-type-select]', 'All posts'); // API request is correct

        var _this$server$pretende7 = this.server.pretender.handledRequests.slice(-1);

        var _this$server$pretende8 = _slicedToArray(_this$server$pretende7, 1);

        lastRequest = _this$server$pretende8[0];
        (0, _chai.expect)(lastRequest.queryParams.filter, '"all" request status filter').to.have.string('status:[draft,scheduled,published]'); // show all posts by editor

        await (0, _helpers.selectChoose)('[data-test-author-select]', editor.name); // API request is correct

        var _this$server$pretende9 = this.server.pretender.handledRequests.slice(-1);

        var _this$server$pretende10 = _slicedToArray(_this$server$pretende9, 1);

        lastRequest = _this$server$pretende10[0];
        (0, _chai.expect)(lastRequest.queryParams.filter, '"editor" request status filter').to.have.string('status:[draft,scheduled,published]');
        (0, _chai.expect)(lastRequest.queryParams.filter, '"editor" request filter param').to.have.string("authors:".concat(editor.slug)); // Displays editor post
        // TODO: implement "filter" param support and fix mirage post->author association
        // expect(find('[data-test-post-id]').length, 'editor post count').to.equal(1);
        // expect(find(`[data-test-post-id="${authorPost.id}"]`), 'author post').to.exist;
        // TODO: test tags dropdown
        // Double-click on a post opens editor

        await (0, _testHelpers.triggerEvent)("[data-test-post-id=\"".concat(authorPost.id, "\"]"), 'dblclick');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after double-click').to.equal("/editor/post/".concat(authorPost.id));
      }); // TODO: skipped due to consistently random failures on Travis
      // options[0] is undefined
      // https://github.com/TryGhost/Ghost/issues/10308

      _mocha.it.skip('sorts tags filter alphabetically', async function () {
        this.server.create('tag', {
          name: 'B - Second',
          slug: 'second'
        });
        this.server.create('tag', {
          name: 'Z - Last',
          slug: 'last'
        });
        this.server.create('tag', {
          name: 'A - First',
          slug: 'first'
        });
        await (0, _testHelpers.visit)('/posts');
        await (0, _helpers.clickTrigger)('[data-test-tag-select]');
        let options = (0, _testHelpers.findAll)('.ember-power-select-option');
        (0, _chai.expect)(options[0].textContent.trim()).to.equal('All tags');
        (0, _chai.expect)(options[1].textContent.trim()).to.equal('A - First');
        (0, _chai.expect)(options[2].textContent.trim()).to.equal('B - Second');
        (0, _chai.expect)(options[3].textContent.trim()).to.equal('Z - Last');
      });
    });
    (0, _mocha.describe)('as author', function () {
      let author, authorPost;
      (0, _mocha.beforeEach)(async function () {
        let authorRole = this.server.create('role', {
          name: 'Author'
        });
        author = this.server.create('user', {
          roles: [authorRole]
        });
        let adminRole = this.server.create('role', {
          name: 'Administrator'
        });
        let admin = this.server.create('user', {
          roles: [adminRole]
        }); // create posts

        authorPost = this.server.create('post', {
          authors: [author],
          status: 'published',
          title: 'Author Post'
        });
        this.server.create('post', {
          authors: [admin],
          status: 'scheduled',
          title: 'Admin Post'
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('only fetches the author\'s posts', async function () {
        await (0, _testHelpers.visit)('/posts'); // trigger a filter request so we can grab the posts API request easily

        await (0, _helpers.selectChoose)('[data-test-type-select]', 'Published posts'); // API request includes author filter

        let _this$server$pretende11 = this.server.pretender.handledRequests.slice(-1),
            _this$server$pretende12 = _slicedToArray(_this$server$pretende11, 1),
            lastRequest = _this$server$pretende12[0];

        (0, _chai.expect)(lastRequest.queryParams.filter).to.have.string("authors:".concat(author.slug)); // only author's post is shown

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-post-id]').length, 'post count').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)("[data-test-post-id=\"".concat(authorPost.id, "\"]")), 'author post').to.exist;
      });
    });
    (0, _mocha.describe)('as contributor', function () {
      let contributor, contributorPost;
      (0, _mocha.beforeEach)(async function () {
        let contributorRole = this.server.create('role', {
          name: 'Contributor'
        });
        contributor = this.server.create('user', {
          roles: [contributorRole]
        });
        let adminRole = this.server.create('role', {
          name: 'Administrator'
        });
        let admin = this.server.create('user', {
          roles: [adminRole]
        }); // Create posts

        contributorPost = this.server.create('post', {
          authors: [contributor],
          status: 'draft',
          title: 'Contributor Post Draft'
        });
        this.server.create('post', {
          authors: [contributor],
          status: 'published',
          title: 'Contributor Published Post'
        });
        this.server.create('post', {
          authors: [admin],
          status: 'scheduled',
          title: 'Admin Post'
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('only fetches the contributor\'s draft posts', async function () {
        await (0, _testHelpers.visit)('/posts'); // Ensure the type, tag, and author selectors don't exist

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-type-select]'), 'type selector').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-tag-select]'), 'tag selector').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-author-select]'), 'author selector').to.not.exist; // Trigger a sort request

        await (0, _helpers.selectChoose)('[data-test-order-select]', 'Oldest'); // API request includes author filter

        let _this$server$pretende13 = this.server.pretender.handledRequests.slice(-1),
            _this$server$pretende14 = _slicedToArray(_this$server$pretende13, 1),
            lastRequest = _this$server$pretende14[0];

        (0, _chai.expect)(lastRequest.queryParams.filter).to.have.string("authors:".concat(contributor.slug)); // only contributor's post is shown

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-post-id]').length, 'post count').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)("[data-test-post-id=\"".concat(contributorPost.id, "\"]")), 'author post').to.exist;
      });
    });
  });
});
define("ghost-admin/tests/acceptance/custom-post-templates-test", ["ghost-admin/utils/ctrl-or-cmd", "ember-cli-mirage/test-support/setup-mirage", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha"], function (_ctrlOrCmd, _setupMirage, _testSupport, _mocha, _testHelpers, _chai, _emberMocha) {
  "use strict";

  // keyCodes
  const KEY_S = 83;
  (0, _mocha.describe)('Acceptance: Custom Post Templates', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.beforeEach)(async function () {
      this.server.loadFixtures('settings');
      let role = this.server.create('role', {
        name: 'Administrator'
      });
      this.server.create('user', {
        roles: [role]
      });
      return await (0, _testSupport.authenticateSession)();
    });
    (0, _mocha.describe)('with custom templates', function () {
      (0, _mocha.beforeEach)(function () {
        this.server.create('theme', {
          active: true,
          name: 'example-theme',
          package: {
            name: 'Example Theme',
            version: '0.1'
          },
          templates: [{
            filename: 'custom-news-bulletin.hbs',
            name: 'News Bulletin',
            for: ['post', 'page'],
            slug: null
          }, {
            filename: 'custom-big-images.hbs',
            name: 'Big Images',
            for: ['post', 'page'],
            slug: null
          }, {
            filename: 'post-one.hbs',
            name: 'One',
            for: ['post'],
            slug: 'one'
          }, {
            filename: 'page-about.hbs',
            name: 'About',
            for: ['page'],
            slug: 'about'
          }]
        });
      });
      (0, _mocha.it)('can change selected template', async function () {
        let post = this.server.create('post', {
          customTemplate: 'custom-news-bulletin.hbs'
        });
        await (0, _testHelpers.visit)('/editor/post/1');
        await (0, _testHelpers.click)('[data-test-psm-trigger]'); // template form should be shown

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-custom-template-form]')).to.exist; // custom template should be selected

        let select = (0, _testHelpers.find)('[data-test-select="custom-template"]');
        (0, _chai.expect)(select.value, 'selected value').to.equal('custom-news-bulletin.hbs'); // templates list should contain default and custom templates in alphabetical order

        (0, _chai.expect)(select.options.length).to.equal(3);
        (0, _chai.expect)(select.options.item(0).value, 'default value').to.equal('');
        (0, _chai.expect)(select.options.item(0).text, 'default text').to.equal('Default');
        (0, _chai.expect)(select.options.item(1).value, 'first custom value').to.equal('custom-big-images.hbs');
        (0, _chai.expect)(select.options.item(1).text, 'first custom text').to.equal('Big Images');
        (0, _chai.expect)(select.options.item(2).value, 'second custom value').to.equal('custom-news-bulletin.hbs');
        (0, _chai.expect)(select.options.item(2).text, 'second custom text').to.equal('News Bulletin'); // select the default template

        await (0, _testHelpers.fillIn)(select, ''); // save then check server record

        await (0, _testHelpers.triggerKeyEvent)('.gh-app', 'keydown', KEY_S, {
          metaKey: _ctrlOrCmd.default === 'command',
          ctrlKey: _ctrlOrCmd.default === 'ctrl'
        });
        (0, _chai.expect)(this.server.db.posts.find(post.id).customTemplate, 'saved custom template').to.equal('');
      });
      (0, _mocha.it)('disables template selector if slug matches slug-based template');
      (0, _mocha.it)('doesn\'t query themes endpoint unncessarily', async function () {
        // eslint-disable-next-line
        let themeRequests = () => {
          return this.server.pretender.handledRequests.filter(function (request) {
            return request.url.match(/\/themes\//);
          });
        };

        this.server.create('post', {
          customTemplate: 'custom-news-bulletin.hbs'
        });
        await (0, _testHelpers.visit)('/editor/post/1');
        await (0, _testHelpers.click)('[data-test-psm-trigger]');
        (0, _chai.expect)(themeRequests().length, 'after first open').to.equal(1);
        await (0, _testHelpers.click)('[data-test-psm-trigger]'); // hide

        await (0, _testHelpers.click)('[data-test-psm-trigger]'); // show

        (0, _chai.expect)(themeRequests().length, 'after second open').to.equal(1);
      });
    });
    (0, _mocha.describe)('without custom templates', function () {
      (0, _mocha.beforeEach)(function () {
        this.server.create('theme', {
          active: true,
          name: 'example-theme',
          package: {
            name: 'Example Theme',
            version: '0.1'
          },
          templates: []
        });
      });
      (0, _mocha.it)('doesn\'t show template selector', async function () {
        this.server.create('post', {
          customTemplate: 'custom-news-bulletin.hbs'
        });
        await (0, _testHelpers.visit)('/editor/post/1');
        await (0, _testHelpers.click)('[data-test-psm-trigger]'); // template form should be shown

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-custom-template-form]')).to.not.exist;
      });
    });
  });
});
define("ghost-admin/tests/acceptance/editor-test", ["ember-cli-mirage", "moment", "ember-cli-mirage/test-support/setup-mirage", "sinon", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "ember-power-datepicker/test-support", "chai", "ember-power-select/test-support", "ember-mocha", "ghost-admin/tests/helpers/visit"], function (_emberCliMirage, _moment, _setupMirage, _sinon, _testSupport, _mocha, _testHelpers, _testSupport2, _chai, _testSupport3, _emberMocha, _visit) {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  // TODO: update ember-power-datepicker to expose modern test helpers
  // https://github.com/cibernox/ember-power-datepicker/issues/30
  (0, _mocha.describe)('Acceptance: Editor', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      let author = this.server.create('user'); // necesary for post-author association

      this.server.create('post', {
        authors: [author]
      });
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/editor/post/1');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
    });
    (0, _mocha.it)('does not redirect to staff page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      let author = this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      this.server.create('post', {
        authors: [author]
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/editor/post/1');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/editor/post/1');
    });
    (0, _mocha.it)('does not redirect to staff page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      let author = this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      this.server.create('post', {
        authors: [author]
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/editor/post/1');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/editor/post/1');
    });
    (0, _mocha.it)('does not redirect to staff page when authenticated as editor', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      let author = this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      this.server.create('post', {
        authors: [author]
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/editor/post/1');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/editor/post/1');
    });
    (0, _mocha.it)('displays 404 when post does not exist', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/editor/post/1');
      (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('error404');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/editor/post/1');
    });
    (0, _mocha.it)('when logged in as a contributor, renders a save button instead of a publish menu & hides tags input', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      let author = this.server.create('user', {
        roles: [role]
      });
      this.server.createList('post', 2, {
        authors: [author]
      });
      this.server.loadFixtures('settings');
      await (0, _testSupport.authenticateSession)(); // post id 1 is a draft, checking for draft behaviour now

      await (0, _visit.visit)('/editor/post/1');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/editor/post/1'); // Expect publish menu to not exist

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-trigger]'), 'publish menu trigger').to.not.exist; // Open post settings menu

      await (0, _testHelpers.click)('[data-test-psm-trigger]'); // Check to make sure that tags input doesn't exist

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-token-input]'), 'tags input').to.not.exist; // post id 2 is published, we should be redirected to index

      await (0, _visit.visit)('/editor/post/2');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/posts');
    });
    (0, _mocha.describe)('when logged in', function () {
      let author;
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        author = this.server.create('user', {
          roles: [role]
        });
        this.server.loadFixtures('settings');
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('renders the editor correctly, PSM Publish Date and Save Button', async function () {
        let _this$server$createLi = this.server.createList('post', 2, {
          authors: [author]
        }),
            _this$server$createLi2 = _slicedToArray(_this$server$createLi, 1),
            post1 = _this$server$createLi2[0];

        let futureTime = (0, _moment.default)().tz('Etc/UTC').add(10, 'minutes'); // post id 1 is a draft, checking for draft behaviour now

        await (0, _visit.visit)('/editor/post/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/editor/post/1'); // open post settings menu

        await (0, _testHelpers.click)('[data-test-psm-trigger]'); // should error, if the publish time is in the wrong format

        await (0, _testHelpers.fillIn)('[data-test-date-time-picker-time-input]', 'foo');
        await (0, _testHelpers.blur)('[data-test-date-time-picker-time-input]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-error]').textContent.trim(), 'inline error response for invalid time').to.equal('Must be in format: "15:00"'); // should error, if the publish time is in the future
        // NOTE: date must be selected first, changing the time first will save
        // with the new time

        await (0, _testSupport2.datepickerSelect)('[data-test-date-time-picker-datepicker]', _moment.default.tz('Etc/UTC').toDate());
        await (0, _testHelpers.fillIn)('[data-test-date-time-picker-time-input]', futureTime.format('HH:mm'));
        await (0, _testHelpers.blur)('[data-test-date-time-picker-time-input]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-error]').textContent.trim(), 'inline error response for future time').to.equal('Must be in the past'); // closing the PSM will reset the invalid date/time

        await (0, _testHelpers.click)('[data-test-close-settings-menu]');
        await (0, _testHelpers.click)('[data-test-psm-trigger]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-error]'), 'date picker error after closing PSM').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-date-input]').value, 'PSM date value after closing with invalid date').to.equal((0, _moment.default)(post1.publishedAt).tz('Etc/UTC').format('MM/DD/YYYY'));
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-time-input]').value, 'PSM time value after closing with invalid date').to.equal((0, _moment.default)(post1.publishedAt).tz('Etc/UTC').format('HH:mm')); // saves the post with the new date

        let validTime = (0, _moment.default)('2017-04-09 12:00').tz('Etc/UTC');
        await (0, _testHelpers.fillIn)('[data-test-date-time-picker-time-input]', validTime.format('HH:mm'));
        await (0, _testHelpers.blur)('[data-test-date-time-picker-time-input]');
        await (0, _testSupport2.datepickerSelect)('[data-test-date-time-picker-datepicker]', validTime.toDate()); // hide psm

        await (0, _testHelpers.click)('[data-test-close-settings-menu]'); // checking the flow of the saving button for a draft

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-trigger]').textContent.trim(), 'draft publish button text').to.equal('Publish');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-editor-post-status]').textContent.trim(), 'draft status text').to.equal('Draft'); // click on publish now

        await (0, _testHelpers.click)('[data-test-publishmenu-trigger]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-draft]'), 'draft publish menu is shown').to.exist;
        await (0, _testHelpers.click)('[data-test-publishmenu-scheduled-option]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-save]').textContent.trim(), 'draft post schedule button text').to.equal('Schedule');
        await (0, _testHelpers.click)('[data-test-publishmenu-published-option]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-save]').textContent.trim(), 'draft post publish button text').to.equal('Publish'); // Publish the post

        await (0, _testHelpers.click)('[data-test-publishmenu-save]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-save]').textContent.trim(), 'publish menu save button updated after draft is published').to.equal('Published');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-published]'), 'publish menu is shown after draft published').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-editor-post-status]').textContent.trim(), 'post status updated after draft published').to.equal('Published');
        await (0, _testHelpers.click)('[data-test-publishmenu-cancel]');
        await (0, _testHelpers.click)('[data-test-publishmenu-trigger]');
        await (0, _testHelpers.click)('[data-test-publishmenu-unpublished-option]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-save]').textContent.trim(), 'published post unpublish button text').to.equal('Unpublish'); // post id 2 is a published post, checking for published post behaviour now

        await (0, _visit.visit)('/editor/post/2');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/editor/post/2');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-date-input]').value).to.equal('12/19/2015');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-time-input]').value).to.equal('16:25'); // saves the post with a new date

        await (0, _testSupport2.datepickerSelect)('[data-test-date-time-picker-datepicker]', (0, _moment.default)('2016-05-10 10:00').toDate());
        await (0, _testHelpers.fillIn)('[data-test-date-time-picker-time-input]', '10:00');
        await (0, _testHelpers.blur)('[data-test-date-time-picker-time-input]'); // saving

        await (0, _testHelpers.click)('[data-test-publishmenu-trigger]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-save]').textContent.trim(), 'published button text').to.equal('Update');
        await (0, _testHelpers.click)('[data-test-publishmenu-save]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-save]').textContent.trim(), 'publish menu save button updated after published post is updated').to.equal('Updated'); // go to settings to change the timezone

        await (0, _visit.visit)('/settings/general');
        await (0, _testHelpers.click)('[data-test-toggle-timezone]');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL for settings').to.equal('/settings/general');
        (0, _chai.expect)((0, _testHelpers.find)('#activeTimezone option:checked').textContent.trim(), 'default timezone').to.equal('(GMT) UTC'); // select a new timezone

        (0, _testHelpers.find)('#activeTimezone option[value="Pacific/Kwajalein"]').selected = true;
        await (0, _testHelpers.triggerEvent)('#activeTimezone', 'change'); // save the settings

        await (0, _testHelpers.click)('.gh-btn.gh-btn-blue');
        (0, _chai.expect)((0, _testHelpers.find)('#activeTimezone option:checked').textContent.trim(), 'new timezone after saving').to.equal('(GMT +12:00) International Date Line West'); // and now go back to the editor

        await (0, _visit.visit)('/editor/post/2');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL in editor').to.equal('/editor/post/2');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-date-input]').value, 'date after timezone change').to.equal('05/10/2016');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-time-input]').value, 'time after timezone change').to.equal('22:00'); // unpublish

        await (0, _testHelpers.click)('[data-test-publishmenu-trigger]');
        await (0, _testHelpers.click)('[data-test-publishmenu-unpublished-option]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-save]').textContent.trim(), 'published post unpublish button text').to.equal('Unpublish');
        await (0, _testHelpers.click)('[data-test-publishmenu-save]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-save]').textContent.trim(), 'publish menu save button updated after published post is unpublished').to.equal('Unpublished');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-draft]'), 'draft menu is shown after unpublished').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-editor-post-status]').textContent.trim(), 'post status updated after unpublished').to.equal('Draft'); // schedule post

        await (0, _testHelpers.click)('[data-test-publishmenu-cancel]');
        await (0, _testHelpers.click)('[data-test-publishmenu-trigger]');

        let newFutureTime = _moment.default.tz('Pacific/Kwajalein').add(10, 'minutes');

        await (0, _testHelpers.click)('[data-test-publishmenu-scheduled-option]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-save]').textContent.trim(), 'draft post, schedule button text').to.equal('Schedule');
        await (0, _testSupport2.datepickerSelect)('[data-test-publishmenu-draft] [data-test-date-time-picker-datepicker]', new Date(newFutureTime.format().replace(/\+.*$/, '')));
        await (0, _testHelpers.click)('[data-test-publishmenu-save]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-save]').textContent.trim(), 'publish menu save button updated after draft is scheduled').to.equal('Scheduled');
        await (0, _testHelpers.click)('[data-test-publishmenu-cancel]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-scheduled]'), 'publish menu is not shown after closed').to.not.exist; // expect countdown to show warning, that post will go live in x minutes

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-schedule-countdown]').textContent.trim(), 'notification countdown').to.contain('Post will go live in');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-trigger]').textContent.trim(), 'scheduled publish button text').to.equal('Scheduled');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-editor-post-status]').textContent.trim(), 'scheduled post status').to.equal('Scheduled'); // Re-schedule

        await (0, _testHelpers.click)('[data-test-publishmenu-trigger]');
        await (0, _testHelpers.click)('[data-test-publishmenu-scheduled-option]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-save]').textContent.trim(), 'scheduled post button reschedule text').to.equal('Reschedule');
        await (0, _testHelpers.click)('[data-test-publishmenu-save]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-save]').textContent.trim(), 'publish menu save button text for a rescheduled post').to.equal('Rescheduled');
        await (0, _testHelpers.click)('[data-test-publishmenu-cancel]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-scheduled]'), 'publish menu is not shown after closed').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-editor-post-status]').textContent.trim(), 'scheduled status text').to.equal('Scheduled'); // unschedule

        await (0, _testHelpers.click)('[data-test-publishmenu-trigger]');
        await (0, _testHelpers.click)('[data-test-publishmenu-draft-option]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-save]').textContent.trim(), 'publish menu save button updated after scheduled post is unscheduled').to.equal('Unschedule');
        await (0, _testHelpers.click)('[data-test-publishmenu-save]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-save]').textContent.trim(), 'publish menu save button updated after scheduled post is unscheduled').to.equal('Unscheduled');
        await (0, _testHelpers.click)('[data-test-publishmenu-cancel]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-trigger]').textContent.trim(), 'publish button text after unschedule').to.equal('Publish');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-editor-post-status]').textContent.trim(), 'status text after unschedule').to.equal('Draft');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-schedule-countdown]'), 'scheduled countdown after unschedule').to.not.exist;
      });
      (0, _mocha.it)('handles validation errors when scheduling', async function () {
        this.server.put('/posts/:id/', function () {
          return new _emberCliMirage.default.Response(422, {}, {
            errors: [{
              type: 'ValidationError',
              message: 'Error test'
            }]
          });
        });
        let post = this.server.create('post', 1, {
          authors: [author],
          status: 'draft'
        });
        let plusTenMin = (0, _moment.default)().utc().add(10, 'minutes');
        await (0, _visit.visit)("/editor/post/".concat(post.id));
        await (0, _testHelpers.click)('[data-test-publishmenu-trigger]');
        await (0, _testHelpers.click)('[data-test-publishmenu-scheduled-option]');
        await (0, _testSupport2.datepickerSelect)('[data-test-publishmenu-draft] [data-test-date-time-picker-datepicker]', plusTenMin.toDate());
        await (0, _testHelpers.fillIn)('[data-test-publishmenu-draft] [data-test-date-time-picker-time-input]', plusTenMin.format('HH:mm'));
        await (0, _testHelpers.blur)('[data-test-publishmenu-draft] [data-test-date-time-picker-time-input]');
        await (0, _testHelpers.click)('[data-test-publishmenu-save]');
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length, 'number of alerts after failed schedule').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent, 'alert text after failed schedule').to.match(/Error test/);
      });
      (0, _mocha.it)('handles title validation errors correctly', async function () {
        this.server.create('post', {
          authors: [author]
        }); // post id 1 is a draft, checking for draft behaviour now

        await (0, _visit.visit)('/editor/post/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/editor/post/1');
        await (0, _testHelpers.fillIn)('[data-test-editor-title-input]', Array(260).join('a'));
        await (0, _testHelpers.click)('[data-test-publishmenu-trigger]');
        await (0, _testHelpers.click)('[data-test-publishmenu-save]');
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length, 'number of alerts after invalid title').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent, 'alert text after invalid title').to.match(/Title cannot be longer than 255 characters/);
      }); // NOTE: these tests are specific to the mobiledoc editor
      // it('inserts a placeholder if the title is blank', async function () {
      //     this.server.createList('post', 1);
      //
      //     // post id 1 is a draft, checking for draft behaviour now
      //     await visit('/editor/post/1');
      //
      //     expect(currentURL(), 'currentURL')
      //         .to.equal('/editor/post/1');
      //
      //     await titleRendered();
      //
      //     let title = find('#koenig-title-input div');
      //     expect(title.data('placeholder')).to.equal('Your Post Title');
      //     expect(title.hasClass('no-content')).to.be.false;
      //
      //     await replaceTitleHTML('');
      //     expect(title.hasClass('no-content')).to.be.true;
      //
      //     await replaceTitleHTML('test');
      //     expect(title.hasClass('no-content')).to.be.false;
      // });
      //
      // it('removes HTML from the title.', async function () {
      //     this.server.createList('post', 1);
      //
      //     // post id 1 is a draft, checking for draft behaviour now
      //     await visit('/editor/post/1');
      //
      //     expect(currentURL(), 'currentURL')
      //         .to.equal('/editor/post/1');
      //
      //     await titleRendered();
      //
      //     let title = find('#koenig-title-input div');
      //     await replaceTitleHTML('<div>TITLE&nbsp;&#09;&nbsp;&thinsp;&ensp;&emsp;TEST</div>&nbsp;');
      //     expect(title.html()).to.equal('TITLE      TEST ');
      // });

      (0, _mocha.it)('renders first countdown notification before scheduled time', async function () {
        let clock = _sinon.default.useFakeTimers((0, _moment.default)().valueOf());

        let compareDate = (0, _moment.default)().tz('Etc/UTC').add(4, 'minutes');
        let compareDateString = compareDate.format('MM/DD/YYYY');
        let compareTimeString = compareDate.format('HH:mm');
        this.server.create('post', {
          publishedAt: _moment.default.utc().add(4, 'minutes'),
          status: 'scheduled',
          authors: [author]
        });
        this.server.create('setting', {
          activeTimezone: 'Europe/Dublin'
        });
        clock.restore();
        await (0, _visit.visit)('/editor/post/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/editor/post/1');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-date-input]').value, 'scheduled date').to.equal(compareDateString);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-time-input]').value, 'scheduled time').to.equal(compareTimeString); // Dropdown menu should be 'Update Post' and 'Unschedule'

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-trigger]').textContent.trim(), 'text in save button for scheduled post').to.equal('Scheduled'); // expect countdown to show warning, that post will go live in x minutes

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-schedule-countdown]').textContent.trim(), 'notification countdown').to.contain('Post will go live in');
      });
      (0, _mocha.it)('shows author token input and allows changing of authors in PSM', async function () {
        let adminRole = this.server.create('role', {
          name: 'Adminstrator'
        });
        let authorRole = this.server.create('role', {
          name: 'Author'
        });
        let user1 = this.server.create('user', {
          name: 'Primary',
          roles: [adminRole]
        });
        this.server.create('user', {
          name: 'Waldo',
          roles: [authorRole]
        });
        this.server.create('post', {
          authors: [user1]
        });
        await (0, _visit.visit)('/editor/post/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/editor/post/1');
        await (0, _testHelpers.click)('button.post-settings');
        let tokens = (0, _testHelpers.findAll)('[data-test-input="authors"] .ember-power-select-multiple-option');
        (0, _chai.expect)(tokens.length).to.equal(1);
        (0, _chai.expect)(tokens[0].textContent.trim()).to.have.string('Primary');
        await (0, _testSupport3.selectChoose)('[data-test-input="authors"]', 'Waldo');
        let savedAuthors = this.server.schema.posts.find('1').authors.models;
        (0, _chai.expect)(savedAuthors.length).to.equal(2);
        (0, _chai.expect)(savedAuthors[0].name).to.equal('Primary');
        (0, _chai.expect)(savedAuthors[1].name).to.equal('Waldo');
      });
      (0, _mocha.it)('autosaves when title loses focus', async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          name: 'Admin',
          roles: [role]
        });
        await (0, _visit.visit)('/editor'); // NOTE: there were checks here for the title element having focus
        // but they were very temperamental whilst running tests in the
        // browser so they've been left out for now

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url on initial visit').to.equal('/editor/post');
        await (0, _testHelpers.click)('[data-test-editor-title-input]');
        await (0, _testHelpers.blur)('[data-test-editor-title-input]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-editor-title-input]').value, 'title value after autosave').to.equal('(Untitled)');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after autosave').to.equal('/editor/post/1');
      });
      (0, _mocha.it)('saves post settings fields', async function () {
        let post = this.server.create('post', {
          authors: [author]
        });
        await (0, _visit.visit)("/editor/post/".concat(post.id)); // TODO: implement tests for other fields

        await (0, _testHelpers.click)('[data-test-psm-trigger]'); // excerpt has validation

        await (0, _testHelpers.fillIn)('[data-test-field="custom-excerpt"]', Array(302).join('a'));
        await (0, _testHelpers.blur)('[data-test-field="custom-excerpt"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="custom-excerpt"]').textContent.trim(), 'excerpt too long error').to.match(/cannot be longer than 300/);
        (0, _chai.expect)(this.server.db.posts.find(post.id).customExcerpt, 'saved excerpt after validation error').to.be.null; // changing custom excerpt auto-saves

        await (0, _testHelpers.fillIn)('[data-test-field="custom-excerpt"]', 'Testing excerpt');
        await (0, _testHelpers.blur)('[data-test-field="custom-excerpt"]');
        (0, _chai.expect)(this.server.db.posts.find(post.id).customExcerpt, 'saved excerpt').to.equal('Testing excerpt'); // -------
        // open code injection subview

        await (0, _testHelpers.click)('[data-test-button="codeinjection"]'); // header injection has validation

        let headerCM = (0, _testHelpers.find)('[data-test-field="codeinjection-head"] .CodeMirror').CodeMirror;
        await headerCM.setValue(Array(65540).join('a'));
        await (0, _testHelpers.click)(headerCM.getInputField());
        await (0, _testHelpers.blur)(headerCM.getInputField());
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="codeinjection-head"]').textContent.trim(), 'header injection too long error').to.match(/cannot be longer than 65535/);
        (0, _chai.expect)(this.server.db.posts.find(post.id).codeinjectionHead, 'saved header injection after validation error').to.be.null; // changing header injection auto-saves

        await headerCM.setValue('<script src="http://example.com/inject-head.js"></script>');
        await (0, _testHelpers.click)(headerCM.getInputField());
        await (0, _testHelpers.blur)(headerCM.getInputField());
        (0, _chai.expect)(this.server.db.posts.find(post.id).codeinjectionHead, 'saved header injection').to.equal('<script src="http://example.com/inject-head.js"></script>'); // footer injection has validation

        let footerCM = (0, _testHelpers.find)('[data-test-field="codeinjection-foot"] .CodeMirror').CodeMirror;
        await footerCM.setValue(Array(65540).join('a'));
        await (0, _testHelpers.click)(footerCM.getInputField());
        await (0, _testHelpers.blur)(footerCM.getInputField());
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="codeinjection-foot"]').textContent.trim(), 'footer injection too long error').to.match(/cannot be longer than 65535/);
        (0, _chai.expect)(this.server.db.posts.find(post.id).codeinjectionFoot, 'saved footer injection after validation error').to.be.null; // changing footer injection auto-saves

        await footerCM.setValue('<script src="http://example.com/inject-foot.js"></script>');
        await (0, _testHelpers.click)(footerCM.getInputField());
        await (0, _testHelpers.blur)(footerCM.getInputField());
        (0, _chai.expect)(this.server.db.posts.find(post.id).codeinjectionFoot, 'saved footer injection').to.equal('<script src="http://example.com/inject-foot.js"></script>'); // closing subview switches back to main PSM view

        await (0, _testHelpers.click)('[data-test-button="close-psm-subview"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-field="codeinjection-head"]').length, 'header injection not present after closing subview').to.equal(0); // -------
        // open twitter data subview

        await (0, _testHelpers.click)('[data-test-button="twitter-data"]'); // twitter title has validation

        await (0, _testHelpers.click)('[data-test-field="twitter-title"]');
        await (0, _testHelpers.fillIn)('[data-test-field="twitter-title"]', Array(302).join('a'));
        await (0, _testHelpers.blur)('[data-test-field="twitter-title"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="twitter-title"]').textContent.trim(), 'twitter title too long error').to.match(/cannot be longer than 300/);
        (0, _chai.expect)(this.server.db.posts.find(post.id).twitterTitle, 'saved twitter title after validation error').to.be.null; // changing twitter title auto-saves
        // twitter title has validation

        await (0, _testHelpers.click)('[data-test-field="twitter-title"]');
        await (0, _testHelpers.fillIn)('[data-test-field="twitter-title"]', 'Test Twitter Title');
        await (0, _testHelpers.blur)('[data-test-field="twitter-title"]');
        (0, _chai.expect)(this.server.db.posts.find(post.id).twitterTitle, 'saved twitter title').to.equal('Test Twitter Title'); // twitter description has validation

        await (0, _testHelpers.click)('[data-test-field="twitter-description"]');
        await (0, _testHelpers.fillIn)('[data-test-field="twitter-description"]', Array(505).join('a'));
        await (0, _testHelpers.blur)('[data-test-field="twitter-description"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="twitter-description"]').textContent.trim(), 'twitter description too long error').to.match(/cannot be longer than 500/);
        (0, _chai.expect)(this.server.db.posts.find(post.id).twitterDescription, 'saved twitter description after validation error').to.be.null; // changing twitter description auto-saves
        // twitter description has validation

        await (0, _testHelpers.click)('[data-test-field="twitter-description"]');
        await (0, _testHelpers.fillIn)('[data-test-field="twitter-description"]', 'Test Twitter Description');
        await (0, _testHelpers.blur)('[data-test-field="twitter-description"]');
        (0, _chai.expect)(this.server.db.posts.find(post.id).twitterDescription, 'saved twitter description').to.equal('Test Twitter Description'); // closing subview switches back to main PSM view

        await (0, _testHelpers.click)('[data-test-button="close-psm-subview"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-field="twitter-title"]').length, 'twitter title not present after closing subview').to.equal(0); // -------
        // open facebook data subview

        await (0, _testHelpers.click)('[data-test-button="facebook-data"]'); // facebook title has validation

        await (0, _testHelpers.click)('[data-test-field="og-title"]');
        await (0, _testHelpers.fillIn)('[data-test-field="og-title"]', Array(302).join('a'));
        await (0, _testHelpers.blur)('[data-test-field="og-title"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="og-title"]').textContent.trim(), 'facebook title too long error').to.match(/cannot be longer than 300/);
        (0, _chai.expect)(this.server.db.posts.find(post.id).ogTitle, 'saved facebook title after validation error').to.be.null; // changing facebook title auto-saves
        // facebook title has validation

        await (0, _testHelpers.click)('[data-test-field="og-title"]');
        await (0, _testHelpers.fillIn)('[data-test-field="og-title"]', 'Test Facebook Title');
        await (0, _testHelpers.blur)('[data-test-field="og-title"]');
        (0, _chai.expect)(this.server.db.posts.find(post.id).ogTitle, 'saved facebook title').to.equal('Test Facebook Title'); // facebook description has validation

        await (0, _testHelpers.click)('[data-test-field="og-description"]');
        await (0, _testHelpers.fillIn)('[data-test-field="og-description"]', Array(505).join('a'));
        await (0, _testHelpers.blur)('[data-test-field="og-description"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="og-description"]').textContent.trim(), 'facebook description too long error').to.match(/cannot be longer than 500/);
        (0, _chai.expect)(this.server.db.posts.find(post.id).ogDescription, 'saved facebook description after validation error').to.be.null; // changing facebook description auto-saves
        // facebook description has validation

        await (0, _testHelpers.click)('[data-test-field="og-description"]');
        await (0, _testHelpers.fillIn)('[data-test-field="og-description"]', 'Test Facebook Description');
        await (0, _testHelpers.blur)('[data-test-field="og-description"]');
        (0, _chai.expect)(this.server.db.posts.find(post.id).ogDescription, 'saved facebook description').to.equal('Test Facebook Description'); // closing subview switches back to main PSM view

        await (0, _testHelpers.click)('[data-test-button="close-psm-subview"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-field="og-title"]').length, 'facebook title not present after closing subview').to.equal(0);
      });
    });
  });
});
define("ghost-admin/tests/acceptance/error-handling-test", ["ember-cli-mirage", "ember-cli-mirage/test-support/setup-mirage", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ghost-admin/tests/helpers/file-upload", "ember-mocha", "ghost-admin/mirage/utils"], function (_emberCliMirage, _setupMirage, _testSupport, _mocha, _testHelpers, _chai, _fileUpload, _emberMocha, _utils) {
  "use strict";

  let htmlErrorResponse = function htmlErrorResponse() {
    return new _emberCliMirage.default.Response(504, {
      'Content-Type': 'text/html'
    }, '<!DOCTYPE html><head><title>Server Error</title></head><body>504 Gateway Timeout</body></html>');
  };

  (0, _mocha.describe)('Acceptance: Error Handling', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.describe)('VersionMismatch errors', function () {
      (0, _mocha.describe)('logged in', function () {
        (0, _mocha.beforeEach)(async function () {
          let role = this.server.create('role', {
            name: 'Administrator'
          });
          this.server.create('user', {
            roles: [role]
          });
          return await (0, _testSupport.authenticateSession)();
        });
        (0, _mocha.it)('displays an alert and disables navigation when saving', async function () {
          this.server.createList('post', 3); // mock the post save endpoint to return version mismatch

          this.server.put('/posts/:id', _utils.versionMismatchResponse);
          await (0, _testHelpers.visit)('/posts');
          await (0, _testHelpers.click)('.posts-list li:nth-of-type(2) a'); // select second post

          await (0, _testHelpers.click)('[data-test-publishmenu-trigger]');
          await (0, _testHelpers.click)('[data-test-publishmenu-save]'); // "Save post"
          // has the refresh to update alert

          (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length).to.equal(1);
          (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent).to.match(/refresh/); // try navigating back to the content list

          await (0, _testHelpers.click)('[data-test-link="posts"]');
          (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('editor.edit');
        });
        (0, _mocha.it)('displays alert and aborts the transition when navigating', async function () {
          await (0, _testHelpers.visit)('/posts'); // mock the tags endpoint to return version mismatch

          this.server.get('/tags/', _utils.versionMismatchResponse);
          await (0, _testHelpers.click)('[data-test-nav="tags"]'); // navigation is blocked on loading screen

          (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('settings.tags_loading'); // has the refresh to update alert

          (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length).to.equal(1);
          (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent).to.match(/refresh/);
        });
        (0, _mocha.it)('displays alert and aborts the transition when an ember-ajax error is thrown whilst navigating', async function () {
          this.server.get('/settings/', _utils.versionMismatchResponse);
          await (0, _testHelpers.visit)('/settings/tags');
          await (0, _testHelpers.click)('[data-test-nav="settings"]'); // navigation is blocked

          (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('settings.general_loading'); // has the refresh to update alert

          (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length).to.equal(1);
          (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent).to.match(/refresh/);
        });
        (0, _mocha.it)('can be triggered when passed in to a component', async function () {
          this.server.post('/subscribers/csv/', _utils.versionMismatchResponse);
          await (0, _testHelpers.visit)('/subscribers');
          await (0, _testHelpers.click)('[data-test-link="import-csv"]');
          await (0, _fileUpload.fileUpload)('.fullscreen-modal input[type="file"]', ['test'], {
            name: 'test.csv'
          }); // alert is shown

          (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length).to.equal(1);
          (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent).to.match(/refresh/);
        });
      });
      (0, _mocha.describe)('logged out', function () {
        (0, _mocha.it)('displays alert', async function () {
          this.server.post('/session', _utils.versionMismatchResponse);
          await (0, _testHelpers.visit)('/signin');
          await (0, _testHelpers.fillIn)('[name="identification"]', 'test@example.com');
          await (0, _testHelpers.fillIn)('[name="password"]', 'password');
          await (0, _testHelpers.click)('.gh-btn-blue'); // has the refresh to update alert

          (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length).to.equal(1);
          (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent).to.match(/refresh/);
        });
      });
    });
    (0, _mocha.describe)('CloudFlare errors', function () {
      (0, _mocha.beforeEach)(async function () {
        this.server.loadFixtures();
        let roles = this.server.schema.roles.where({
          name: 'Administrator'
        });
        this.server.create('user', {
          roles
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('handles Ember Data HTML response', async function () {
        this.server.put('/posts/1/', htmlErrorResponse);
        this.server.create('post');
        await (0, _testHelpers.visit)('/editor/post/1');
        await (0, _testHelpers.click)('[data-test-publishmenu-trigger]');
        await (0, _testHelpers.click)('[data-test-publishmenu-save]');
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length).to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent).to.not.match(/html>/);
        (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent).to.match(/Request was rejected due to server error/);
      });
      (0, _mocha.it)('handles ember-ajax HTML response', async function () {
        this.server.del('/themes/foo/', htmlErrorResponse);
        await (0, _testHelpers.visit)('/settings/design');
        await (0, _testHelpers.click)('[data-test-theme-id="foo"] [data-test-theme-delete-button]');
        await (0, _testHelpers.click)('.fullscreen-modal [data-test-delete-button]');
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length).to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent).to.not.match(/html>/);
        (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent).to.match(/Request was rejected due to server error/);
      });
    });
  });
});
define("ghost-admin/tests/acceptance/members-test", ["ember-cli-mirage/test-support/setup-mirage", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ghost-admin/tests/helpers/visit"], function (_setupMirage, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Members', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/members');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/signin');
    });
    (0, _mocha.it)('redirects non-admins to posts', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role]
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/members');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/site');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav="members"]'), 'sidebar link').to.not.exist;
    });
    (0, _mocha.describe)('as admin', function () {
      (0, _mocha.beforeEach)(async function () {
        this.server.loadFixtures('configs');
        let config = this.server.schema.configs.first();
        config.update({
          enableDeveloperExperiments: true
        });
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('redirects to home if developer experiments is disabled', async function () {
        let config = this.server.schema.configs.first();
        config.update({
          enableDeveloperExperiments: false
        });
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/site');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav="members"]'), 'sidebar link').to.not.exist;
      });
      (0, _mocha.it)('shows sidebar link which navigates to members list', async function () {
        await (0, _visit.visit)('/settings/labs');
        await (0, _testHelpers.click)('#labs-members');
        await (0, _visit.visit)('/');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav="members"]'), 'sidebar link').to.exist;
        await (0, _testHelpers.click)('[data-test-nav="members"]');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/members');
        (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('members');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-screen-title]')).to.have.text('Members');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/password-reset-test", ["ember-cli-mirage/test-support/setup-mirage", "@ember/test-helpers", "mocha", "chai", "ember-simple-auth/test-support", "ember-mocha"], function (_setupMirage, _testHelpers, _mocha, _chai, _testSupport, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Password Reset', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.describe)('request reset', function () {
      (0, _mocha.it)('is successful with valid data', async function () {
        await (0, _testSupport.invalidateSession)();
        await (0, _testHelpers.visit)('/signin');
        await (0, _testHelpers.fillIn)('input[name="identification"]', 'test@example.com');
        await (0, _testHelpers.click)('.forgotten-link'); // an alert with instructions is displayed

        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert-blue').length, 'alert count').to.equal(1);
      });
      (0, _mocha.it)('shows error messages with invalid data', async function () {
        await (0, _testHelpers.visit)('/signin'); // no email provided

        await (0, _testHelpers.click)('.forgotten-link'); // email field is invalid

        (0, _chai.expect)((0, _testHelpers.find)('input[name="identification"]').closest('.form-group'), 'email field has error class (no email)').to.match('.error'); // password field is valid

        (0, _chai.expect)((0, _testHelpers.find)('input[name="password"]').closest('.form-group'), 'password field has error class (no email)').to.not.match('.error'); // error message shown

        (0, _chai.expect)((0, _testHelpers.find)('p.main-error').textContent.trim(), 'error message').to.equal('We need your email address to reset your password!'); // invalid email provided

        await (0, _testHelpers.fillIn)('input[name="identification"]', 'test');
        await (0, _testHelpers.click)('.forgotten-link'); // email field is invalid

        (0, _chai.expect)((0, _testHelpers.find)('input[name="identification"]').closest('.form-group'), 'email field has error class (invalid email)').to.match('.error'); // password field is valid

        (0, _chai.expect)((0, _testHelpers.find)('input[name="password"]').closest('.form-group'), 'password field has error class (invalid email)').to.not.match('.error'); // error message

        (0, _chai.expect)((0, _testHelpers.find)('p.main-error').textContent.trim(), 'error message').to.equal('We need your email address to reset your password!'); // unknown email provided

        await (0, _testHelpers.fillIn)('input[name="identification"]', 'unknown@example.com');
        await (0, _testHelpers.click)('.forgotten-link'); // email field is invalid

        (0, _chai.expect)((0, _testHelpers.find)('input[name="identification"]').closest('.form-group'), 'email field has error class (unknown email)').to.match('.error'); // password field is valid

        (0, _chai.expect)((0, _testHelpers.find)('input[name="password"]').closest('.form-group'), 'password field has error class (unknown email)').to.not.match('.error'); // error message

        (0, _chai.expect)((0, _testHelpers.find)('p.main-error').textContent.trim(), 'error message').to.equal('There is no user with that email address.');
      });
    }); // TODO: add tests for the change password screen
  });
});
define("ghost-admin/tests/acceptance/settings/amp-test", ["ghost-admin/utils/ctrl-or-cmd", "ember-cli-mirage/test-support/setup-mirage", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ghost-admin/tests/helpers/visit"], function (_ctrlOrCmd, _setupMirage, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _visit) {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  (0, _mocha.describe)('Acceptance: Settings - Integrations - AMP', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/settings/integrations/amp');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/amp');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/amp');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as editor', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/amp');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff');
    });
    (0, _mocha.describe)('when logged in', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('it enables or disables AMP properly and saves it', async function () {
        await (0, _visit.visit)('/settings/integrations/amp'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/amp'); // AMP is enabled by default

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-amp-checkbox]').checked, 'AMP checkbox').to.be.true;
        await (0, _testHelpers.click)('[data-test-amp-checkbox]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-amp-checkbox]').checked, 'AMP checkbox').to.be.false;
        await (0, _testHelpers.click)('[data-test-save-button]');

        let _this$server$pretende = this.server.pretender.handledRequests.slice(-1),
            _this$server$pretende2 = _slicedToArray(_this$server$pretende, 1),
            lastRequest = _this$server$pretende2[0];

        let params = JSON.parse(lastRequest.requestBody);
        (0, _chai.expect)(params.settings.findBy('key', 'amp').value).to.equal(false); // CMD-S shortcut works

        await (0, _testHelpers.click)('[data-test-amp-checkbox]');
        await (0, _testHelpers.triggerEvent)('.gh-app', 'keydown', {
          keyCode: 83,
          // s
          metaKey: _ctrlOrCmd.default === 'command',
          ctrlKey: _ctrlOrCmd.default === 'ctrl'
        }); // we've already saved in this test so there's no on-screen indication
        // that we've had another save, check the request was fired instead

        let _this$server$pretende3 = this.server.pretender.handledRequests.slice(-1),
            _this$server$pretende4 = _slicedToArray(_this$server$pretende3, 1),
            newRequest = _this$server$pretende4[0];

        params = JSON.parse(newRequest.requestBody);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-amp-checkbox]').checked, 'AMP checkbox').to.be.true;
        (0, _chai.expect)(params.settings.findBy('key', 'amp').value).to.equal(true);
      });
      (0, _mocha.it)('warns when leaving without saving', async function () {
        await (0, _visit.visit)('/settings/integrations/amp'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/amp'); // AMP is enabled by default

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-amp-checkbox]').checked, 'AMP checkbox default').to.be.true;
        await (0, _testHelpers.click)('[data-test-amp-checkbox]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-amp-checkbox]').checked, 'AMP checkbox after click').to.be.false;
        await (0, _visit.visit)('/staff');
        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal').length, 'unsaved changes modal exists').to.equal(1); // Leave without saving

        await (0, _testHelpers.click)('.fullscreen-modal [data-test-leave-button]');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL after leave without saving').to.equal('/staff');
        await (0, _visit.visit)('/settings/integrations/amp');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL after return').to.equal('/settings/integrations/amp'); // settings were not saved

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-amp-checkbox]').checked, 'AMP checkbox').to.be.true;
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/code-injection-test", ["ghost-admin/utils/ctrl-or-cmd", "ember-cli-mirage/test-support/setup-mirage", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ghost-admin/tests/helpers/visit"], function (_ctrlOrCmd, _setupMirage, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _visit) {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  (0, _mocha.describe)('Acceptance: Settings - Code-Injection', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/settings/code-injection');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/code-injection');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/code-injection');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as editor', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/code-injection');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff');
    });
    (0, _mocha.describe)('when logged in', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('it renders, loads and saves editors correctly', async function () {
        await (0, _visit.visit)('/settings/code-injection'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/code-injection'); // has correct page title

        (0, _chai.expect)(document.title, 'page title').to.equal('Settings - Code injection - Test Blog'); // highlights nav menu

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav="code-injection"]'), 'highlights nav menu item').to.have.class('active');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Save');
        (0, _chai.expect)((0, _testHelpers.findAll)('#ghost-head .CodeMirror').length, 'ghost head codemirror element').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('#ghost-head .CodeMirror'), 'ghost head editor theme').to.have.class('cm-s-xq-light');
        (0, _chai.expect)((0, _testHelpers.findAll)('#ghost-foot .CodeMirror').length, 'ghost head codemirror element').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('#ghost-foot .CodeMirror'), 'ghost head editor theme').to.have.class('cm-s-xq-light');
        await (0, _testHelpers.click)('[data-test-save-button]');

        let _this$server$pretende = this.server.pretender.handledRequests.slice(-1),
            _this$server$pretende2 = _slicedToArray(_this$server$pretende, 1),
            lastRequest = _this$server$pretende2[0];

        let params = JSON.parse(lastRequest.requestBody);
        (0, _chai.expect)(params.settings.findBy('key', 'codeinjection_head').value).to.equal('');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Saved'); // CMD-S shortcut works

        await (0, _testHelpers.triggerEvent)('.gh-app', 'keydown', {
          keyCode: 83,
          // s
          metaKey: _ctrlOrCmd.default === 'command',
          ctrlKey: _ctrlOrCmd.default === 'ctrl'
        }); // we've already saved in this test so there's no on-screen indication
        // that we've had another save, check the request was fired instead

        let _this$server$pretende3 = this.server.pretender.handledRequests.slice(-1),
            _this$server$pretende4 = _slicedToArray(_this$server$pretende3, 1),
            newRequest = _this$server$pretende4[0];

        params = JSON.parse(newRequest.requestBody);
        (0, _chai.expect)(params.settings.findBy('key', 'codeinjection_head').value).to.equal('');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Saved');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/design-test", ["ember-cli-mirage", "ghost-admin/utils/ctrl-or-cmd", "ghost-admin/mirage/config/themes", "ember-cli-mirage/test-support/setup-mirage", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ghost-admin/tests/helpers/file-upload", "ember-mocha", "ghost-admin/tests/helpers/visit"], function (_emberCliMirage, _ctrlOrCmd, _themes, _setupMirage, _testSupport, _mocha, _testHelpers, _chai, _fileUpload, _emberMocha, _visit) {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  // simulate jQuery's `:visible` pseudo-selector
  function withText(elements) {
    return Array.from(elements).filter(elem => elem.textContent.trim() !== '');
  }

  (0, _mocha.describe)('Acceptance: Settings - Design', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/settings/design');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/design');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/design');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.describe)('when logged in', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('can visit /settings/design', async function () {
        await (0, _visit.visit)('/settings/design');
        (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('settings.design.index');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Save'); // fixtures contain two nav items, check for three rows as we
        // should have one extra that's blank

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-navitem]').length, 'navigation items count').to.equal(3);
      });
      (0, _mocha.it)('saves navigation settings', async function () {
        await (0, _visit.visit)('/settings/design');
        await (0, _testHelpers.fillIn)('[data-test-navitem="0"] [data-test-input="label"]', 'Test');
        await (0, _testHelpers.typeIn)('[data-test-navitem="0"] [data-test-input="url"]', '/test');
        await (0, _testHelpers.click)('[data-test-save-button]');

        let _this$server$db$setti = this.server.db.settings.where({
          key: 'navigation'
        }),
            _this$server$db$setti2 = _slicedToArray(_this$server$db$setti, 1),
            navSetting = _this$server$db$setti2[0];

        (0, _chai.expect)(navSetting.value).to.equal('[{"label":"Test","url":"/test/"},{"label":"About","url":"/about"}]'); // don't test against .error directly as it will pick up failed
        // tests "pre.error" elements

        (0, _chai.expect)((0, _testHelpers.findAll)('span.error').length, 'error messages count').to.equal(0);
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length, 'alerts count').to.equal(0);
        (0, _chai.expect)(withText((0, _testHelpers.findAll)('[data-test-error]')).length, 'validation errors count').to.equal(0);
      });
      (0, _mocha.it)('validates new item correctly on save', async function () {
        await (0, _visit.visit)('/settings/design');
        await (0, _testHelpers.click)('[data-test-save-button]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-navitem]').length, 'number of nav items after saving with blank new item').to.equal(3);
        await (0, _testHelpers.fillIn)('[data-test-navitem="new"] [data-test-input="label"]', 'Test');
        await (0, _testHelpers.fillIn)('[data-test-navitem="new"] [data-test-input="url"]', '');
        await (0, _testHelpers.typeIn)('[data-test-navitem="new"] [data-test-input="url"]', 'http://invalid domain/');
        await (0, _testHelpers.click)('[data-test-save-button]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-navitem]').length, 'number of nav items after saving with invalid new item').to.equal(3);
        (0, _chai.expect)(withText((0, _testHelpers.findAll)('[data-test-navitem="new"] [data-test-error]')).length, 'number of invalid fields in new item').to.equal(1);
      });
      (0, _mocha.it)('clears unsaved settings when navigating away but warns with a confirmation dialog', async function () {
        await (0, _visit.visit)('/settings/design');
        await (0, _testHelpers.fillIn)('[data-test-navitem="0"] [data-test-input="label"]', 'Test');
        await (0, _testHelpers.blur)('[data-test-navitem="0"] [data-test-input="label"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-navitem="0"] [data-test-input="label"]').value).to.equal('Test');
        await (0, _visit.visit)('/settings/code-injection');
        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal').length, 'modal exists').to.equal(1); // Leave without saving

        await (0, _testHelpers.click)('.fullscreen-modal [data-test-leave-button]'), 'leave without saving';
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/code-injection');
        await (0, _visit.visit)('/settings/design');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-navitem="0"] [data-test-input="label"]').value).to.equal('Home');
      });
      (0, _mocha.it)('can add and remove items', async function () {
        await (0, _visit.visit)('/settings/design');
        await (0, _testHelpers.click)('.gh-blognav-add');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-navitem="new"] [data-test-error="label"]').textContent.trim(), 'blank label has validation error').to.not.be.empty;
        await (0, _testHelpers.fillIn)('[data-test-navitem="new"] [data-test-input="label"]', '');
        await (0, _testHelpers.typeIn)('[data-test-navitem="new"] [data-test-input="label"]', 'New');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-navitem="new"] [data-test-error="label"]').textContent.trim(), 'label validation is visible after typing').to.be.empty;
        await (0, _testHelpers.fillIn)('[data-test-navitem="new"] [data-test-input="url"]', '');
        await (0, _testHelpers.typeIn)('[data-test-navitem="new"] [data-test-input="url"]', '/new');
        await (0, _testHelpers.blur)('[data-test-navitem="new"] [data-test-input="url"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-navitem="new"] [data-test-error="url"]').textContent.trim(), 'url validation is visible after typing').to.be.empty;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-navitem="new"] [data-test-input="url"]').value).to.equal("".concat(window.location.origin, "/new/"));
        await (0, _testHelpers.click)('.gh-blognav-add');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-navitem]').length, 'number of nav items after successful add').to.equal(4);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-navitem="new"] [data-test-input="label"]').value, 'new item label value after successful add').to.be.empty;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-navitem="new"] [data-test-input="url"]').value, 'new item url value after successful add').to.equal("".concat(window.location.origin, "/"));
        (0, _chai.expect)(withText((0, _testHelpers.findAll)('[data-test-navitem] [data-test-error]')).length, 'number or validation errors shown after successful add').to.equal(0);
        await (0, _testHelpers.click)('[data-test-navitem="0"] .gh-blognav-delete');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-navitem]').length, 'number of nav items after successful remove').to.equal(3); // CMD-S shortcut works

        await (0, _testHelpers.triggerEvent)('.gh-app', 'keydown', {
          keyCode: 83,
          // s
          metaKey: _ctrlOrCmd.default === 'command',
          ctrlKey: _ctrlOrCmd.default === 'ctrl'
        });

        let _this$server$db$setti3 = this.server.db.settings.where({
          key: 'navigation'
        }),
            _this$server$db$setti4 = _slicedToArray(_this$server$db$setti3, 1),
            navSetting = _this$server$db$setti4[0];

        (0, _chai.expect)(navSetting.value).to.equal('[{"label":"About","url":"/about"},{"label":"New","url":"/new/"}]');
      });
      (0, _mocha.it)('allows management of themes', async function () {
        // lists available themes + active theme is highlighted
        // theme upload
        // - displays modal
        // - validates mime type
        // - validates casper.zip
        // - handles validation errors
        // - handles upload and close
        // - handles upload and activate
        // - displays overwrite warning if theme already exists
        // theme activation
        // - switches theme
        // theme deletion
        // - displays modal
        // - deletes theme and refreshes list
        this.server.loadFixtures('themes');
        await (0, _visit.visit)('/settings/design'); // lists available themes (themes are specified in mirage/fixtures/settings)

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-theme-id]').length, 'shows correct number of themes').to.equal(3);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-active="true"] [data-test-theme-title]').textContent.trim(), 'Blog theme marked as active').to.equal('Blog (default)'); // theme upload displays modal

        await (0, _testHelpers.click)('[data-test-upload-theme-button]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-modal="upload-theme"]').length, 'theme upload modal displayed after button click').to.equal(1); // cancelling theme upload closes modal

        await (0, _testHelpers.click)('.fullscreen-modal [data-test-close-button]');
        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal').length === 0, 'upload theme modal is closed when cancelling').to.be.true; // theme upload validates mime type

        await (0, _testHelpers.click)('[data-test-upload-theme-button]');
        await (0, _fileUpload.fileUpload)('.fullscreen-modal input[type="file"]', ['test'], {
          type: 'text/csv'
        });
        (0, _chai.expect)((0, _testHelpers.find)('.fullscreen-modal .failed').textContent, 'validation error is shown for invalid mime type').to.match(/is not supported/); // theme upload validates casper.zip

        await (0, _testHelpers.click)('[data-test-upload-try-again-button]');
        await (0, _fileUpload.fileUpload)('.fullscreen-modal input[type="file"]', ['test'], {
          name: 'casper.zip',
          type: 'application/zip'
        });
        (0, _chai.expect)((0, _testHelpers.find)('.fullscreen-modal .failed').textContent, 'validation error is shown when uploading casper.zip').to.match(/default Casper theme cannot be overwritten/); // theme upload handles upload errors

        this.server.post('/themes/upload/', function () {
          return new _emberCliMirage.default.Response(422, {}, {
            errors: [{
              message: 'Invalid theme'
            }]
          });
        });
        await (0, _testHelpers.click)('[data-test-upload-try-again-button]');
        await (0, _fileUpload.fileUpload)('.fullscreen-modal input[type="file"]', ['test'], {
          name: 'error.zip',
          type: 'application/zip'
        });
        (0, _chai.expect)((0, _testHelpers.find)('.fullscreen-modal .failed').textContent.trim(), 'validation error is passed through from server').to.equal('Invalid theme'); // reset to default mirage handlers

        (0, _themes.default)(this.server); // theme upload handles validation errors

        this.server.post('/themes/upload/', function () {
          return new _emberCliMirage.default.Response(422, {}, {
            errors: [{
              message: 'Theme is not compatible or contains errors.',
              type: 'ThemeValidationError',
              details: {
                errors: [{
                  level: 'error',
                  rule: 'Assets such as CSS & JS must use the <code>{{asset}}</code> helper',
                  details: '<p>The listed files should be included using the <code>{{asset}}</code> helper.</p>',
                  failures: [{
                    ref: '/assets/javascripts/ui.js'
                  }]
                }, {
                  level: 'error',
                  rule: 'Templates must contain valid Handlebars.',
                  failures: [{
                    ref: 'index.hbs',
                    message: 'The partial index_meta could not be found'
                  }, {
                    ref: 'tag.hbs',
                    message: 'The partial index_meta could not be found'
                  }]
                }]
              }
            }]
          });
        });
        await (0, _testHelpers.click)('[data-test-upload-try-again-button]');
        await (0, _fileUpload.fileUpload)('.fullscreen-modal input[type="file"]', ['test'], {
          name: 'bad-theme.zip',
          type: 'application/zip'
        });
        (0, _chai.expect)((0, _testHelpers.find)('.fullscreen-modal h1').textContent.trim(), 'modal title after uploading invalid theme').to.equal('Invalid theme');
        (0, _chai.expect)((0, _testHelpers.findAll)('.theme-validation-rule-text')[1].textContent, 'top-level errors are displayed').to.match(/Templates must contain valid Handlebars/);
        await (0, _testHelpers.click)('[data-test-toggle-details]');
        (0, _chai.expect)((0, _testHelpers.find)('.theme-validation-details').textContent, 'top-level errors do not escape HTML').to.match(/The listed files should be included using the {{asset}} helper/);
        (0, _chai.expect)((0, _testHelpers.find)('.theme-validation-list ul li').textContent, 'individual failures are displayed').to.match(/\/assets\/javascripts\/ui\.js/); // reset to default mirage handlers

        (0, _themes.default)(this.server);
        await (0, _testHelpers.click)('.fullscreen-modal [data-test-try-again-button]');
        (0, _chai.expect)((0, _testHelpers.findAll)('.theme-validation-errors').length, '"Try Again" resets form after theme validation error').to.equal(0);
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-image-uploader').length, '"Try Again" resets form after theme validation error').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('.fullscreen-modal h1').textContent.trim(), '"Try Again" resets form after theme validation error').to.equal('Upload a theme'); // theme upload handles validation warnings

        this.server.post('/themes/upload/', function (_ref) {
          let themes = _ref.themes;
          let theme = {
            name: 'blackpalm',
            package: {
              name: 'BlackPalm',
              version: '1.0.0'
            }
          };
          themes.create(theme);
          theme.warnings = [{
            level: 'warning',
            rule: 'Assets such as CSS & JS must use the <code>{{asset}}</code> helper',
            details: '<p>The listed files should be included using the <code>{{asset}}</code> helper.  For more information, please see the <a href="https://docs.ghost.org/api/handlebars-themes/helpers/asset/">asset helper documentation</a>.</p>',
            failures: [{
              ref: '/assets/dist/img/apple-touch-icon.png'
            }, {
              ref: '/assets/dist/img/favicon.ico'
            }, {
              ref: '/assets/dist/css/blackpalm.min.css'
            }, {
              ref: '/assets/dist/js/blackpalm.min.js'
            }],
            code: 'GS030-ASSET-REQ'
          }];
          return new _emberCliMirage.default.Response(200, {}, {
            themes: [theme]
          });
        });
        await (0, _fileUpload.fileUpload)('.fullscreen-modal input[type="file"]', ['test'], {
          name: 'warning-theme.zip',
          type: 'application/zip'
        });
        (0, _chai.expect)((0, _testHelpers.find)('.fullscreen-modal h1').textContent.trim(), 'modal title after uploading theme with warnings').to.equal('Upload successful with warnings');
        await (0, _testHelpers.click)('[data-test-toggle-details]');
        (0, _chai.expect)((0, _testHelpers.find)('.theme-validation-details').textContent, 'top-level warnings are displayed').to.match(/The listed files should be included using the {{asset}} helper/);
        (0, _chai.expect)((0, _testHelpers.find)('.theme-validation-list ul li').textContent, 'individual warning failures are displayed').to.match(/\/assets\/dist\/img\/apple-touch-icon\.png/); // reset to default mirage handlers

        (0, _themes.default)(this.server);
        await (0, _testHelpers.click)('.fullscreen-modal [data-test-close-button]'); // theme upload handles success then close

        await (0, _testHelpers.click)('[data-test-upload-theme-button]');
        await (0, _fileUpload.fileUpload)('.fullscreen-modal input[type="file"]', ['test'], {
          name: 'theme-1.zip',
          type: 'application/zip'
        });
        (0, _chai.expect)((0, _testHelpers.find)('.fullscreen-modal h1').textContent.trim(), 'modal header after successful upload').to.equal('Upload successful!');
        (0, _chai.expect)((0, _testHelpers.find)('.modal-body').textContent, 'modal displays theme name after successful upload').to.match(/"Test 1 - 0\.1" uploaded successfully/);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-theme-id]').length, 'number of themes in list grows after upload').to.equal(5);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-active="true"] [data-test-theme-title]').textContent.trim(), 'newly uploaded theme is not active').to.equal('Blog (default)');
        await (0, _testHelpers.click)('.fullscreen-modal [data-test-close-button]'); // theme upload handles success then activate

        await (0, _testHelpers.click)('[data-test-upload-theme-button]');
        await (0, _fileUpload.fileUpload)('.fullscreen-modal input[type="file"]', ['test'], {
          name: 'theme-2.zip',
          type: 'application/zip'
        });
        await (0, _testHelpers.click)('.fullscreen-modal [data-test-activate-now-button]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-theme-id]').length, 'number of themes in list grows after upload and activate').to.equal(6);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-active="true"] [data-test-theme-title]').textContent.trim(), 'newly uploaded+activated theme is active').to.equal('Test 2'); // theme activation switches active theme

        await (0, _testHelpers.click)('[data-test-theme-id="casper"] [data-test-theme-activate-button]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-id="test-2"] .apps-card-app').classList.contains('theme-list-item--active'), 'previously active theme is not active').to.be.false;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-id="casper"] .apps-card-app').classList.contains('theme-list-item--active'), 'activated theme is active').to.be.true; // theme activation shows errors

        this.server.put('themes/:theme/activate', function () {
          return new _emberCliMirage.default.Response(422, {}, {
            errors: [{
              message: 'Theme is not compatible or contains errors.',
              type: 'ThemeValidationError',
              details: {
                checkedVersion: '2.x',
                name: 'casper',
                version: '2.9.7',
                errors: [{
                  level: 'error',
                  rule: 'Assets such as CSS & JS must use the <code>{{asset}}</code> helper',
                  details: '<p>The listed files should be included using the <code>{{asset}}</code> helper.</p>',
                  failures: [{
                    ref: '/assets/javascripts/ui.js'
                  }]
                }, {
                  level: 'error',
                  fatal: true,
                  rule: 'Templates must contain valid Handlebars.',
                  failures: [{
                    ref: 'index.hbs',
                    message: 'The partial index_meta could not be found'
                  }, {
                    ref: 'tag.hbs',
                    message: 'The partial index_meta could not be found'
                  }]
                }]
              }
            }]
          });
        });
        await (0, _testHelpers.click)('[data-test-theme-id="test-2"] [data-test-theme-activate-button]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-warnings-modal]')).to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-warnings-title]').textContent.trim(), 'modal title after activating invalid theme').to.equal('Activation failed');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-fatal-errors]').textContent, 'top-level errors are displayed in activation errors').to.match(/Templates must contain valid Handlebars/);
        await (0, _testHelpers.click)('[data-test-theme-errors] [data-test-toggle-details]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-errors] .theme-validation-details').textContent, 'top-level errors do not escape HTML in activation errors').to.match(/The listed files should be included using the {{asset}} helper/);
        (0, _chai.expect)((0, _testHelpers.find)('.theme-validation-list ul li').textContent, 'individual failures are displayed in activation errors').to.match(/\/assets\/javascripts\/ui\.js/); // restore default mirage handlers

        (0, _themes.default)(this.server);
        await (0, _testHelpers.click)('[data-test-modal-close-button]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-warnings-modal]')).to.not.exist; // theme activation shows warnings

        this.server.put('themes/:theme/activate', function (_ref2, _ref3) {
          let themes = _ref2.themes;
          let params = _ref3.params;
          themes.all().update('active', false);
          let theme = themes.findBy({
            name: params.theme
          }).update({
            active: true
          });
          theme.update({
            warnings: [{
              level: 'warning',
              rule: 'Assets such as CSS & JS must use the <code>{{asset}}</code> helper',
              details: '<p>The listed files should be included using the <code>{{asset}}</code> helper.  For more information, please see the <a href="https://docs.ghost.org/api/handlebars-themes/helpers/asset/">asset helper documentation</a>.</p>',
              failures: [{
                ref: '/assets/dist/img/apple-touch-icon.png'
              }, {
                ref: '/assets/dist/img/favicon.ico'
              }, {
                ref: '/assets/dist/css/blackpalm.min.css'
              }, {
                ref: '/assets/dist/js/blackpalm.min.js'
              }],
              code: 'GS030-ASSET-REQ'
            }]
          });
          return {
            themes: [theme]
          };
        });
        await (0, _testHelpers.click)('[data-test-theme-id="test-2"] [data-test-theme-activate-button]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-warnings-modal]')).to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-warnings-title]').textContent.trim(), 'modal title after activating theme with warnings').to.equal('Activation successful with warnings');
        await (0, _testHelpers.click)('[data-test-toggle-details]');
        (0, _chai.expect)((0, _testHelpers.find)('.theme-validation-details').textContent, 'top-level warnings are displayed in activation warnings').to.match(/The listed files should be included using the {{asset}} helper/);
        (0, _chai.expect)((0, _testHelpers.find)('.theme-validation-list ul li').textContent, 'individual warning failures are displayed in activation warnings').to.match(/\/assets\/dist\/img\/apple-touch-icon\.png/); // restore default mirage handlers

        (0, _themes.default)(this.server);
        await (0, _testHelpers.click)('[data-test-modal-close-button]'); // reactivate casper to continue tests

        await (0, _testHelpers.click)('[data-test-theme-id="casper"] [data-test-theme-activate-button]'); // theme deletion displays modal

        await (0, _testHelpers.click)('[data-test-theme-id="test-1"] [data-test-theme-delete-button]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-delete-theme-modal]').length, 'theme deletion modal displayed after button click').to.equal(1); // cancelling theme deletion closes modal

        await (0, _testHelpers.click)('.fullscreen-modal [data-test-cancel-button]');
        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal').length === 0, 'delete theme modal is closed when cancelling').to.be.true; // confirming theme deletion closes modal and refreshes list

        await (0, _testHelpers.click)('[data-test-theme-id="test-1"] [data-test-theme-delete-button]');
        await (0, _testHelpers.click)('.fullscreen-modal [data-test-delete-button]');
        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal').length === 0, 'delete theme modal closes after deletion').to.be.true;
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-theme-id]').length, 'number of themes in list shrinks after delete').to.equal(5);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-title]').textContent, 'correct theme is removed from theme list after deletion').to.not.match(/Test 1/); // validation errors are handled when deleting a theme

        this.server.del('/themes/:theme/', function () {
          return new _emberCliMirage.default.Response(422, {}, {
            errors: [{
              message: 'Can\'t delete theme'
            }]
          });
        });
        await (0, _testHelpers.click)('[data-test-theme-id="test-2"] [data-test-theme-delete-button]');
        await (0, _testHelpers.click)('.fullscreen-modal [data-test-delete-button]');
        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal').length === 0, 'delete theme modal closes after failed deletion').to.be.true;
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length, 'alert is shown when deletion fails').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent, 'failed deletion alert has correct text').to.match(/Can't delete theme/); // restore default mirage handlers

        (0, _themes.default)(this.server);
      });
      (0, _mocha.it)('can delete then re-upload the same theme', async function () {
        this.server.loadFixtures('themes'); // mock theme upload to emulate uploading theme with same id

        this.server.post('/themes/upload/', function (_ref4) {
          let themes = _ref4.themes;
          let theme = themes.create({
            name: 'foo',
            package: {
              name: 'Foo',
              version: '0.1'
            }
          });
          return {
            themes: [theme]
          };
        });
        await (0, _visit.visit)('/settings/design');
        await (0, _testHelpers.click)('[data-test-theme-id="foo"] [data-test-theme-delete-button]');
        await (0, _testHelpers.click)('.fullscreen-modal [data-test-delete-button]');
        await (0, _testHelpers.click)('[data-test-upload-theme-button]');
        await (0, _fileUpload.fileUpload)('.fullscreen-modal input[type="file"]', ['test'], {
          name: 'foo.zip',
          type: 'application/zip'
        }); // this will fail if upload failed because there won't be an activate now button

        await (0, _testHelpers.click)('.fullscreen-modal [data-test-activate-now-button]');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/general-test", ["ghost-admin/utils/ctrl-or-cmd", "ghost-admin/mirage/config/uploads", "ember-cli-mirage/test-support/setup-mirage", "ember-test-helpers/wait", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ghost-admin/tests/helpers/file-upload", "ember-mocha", "ghost-admin/tests/helpers/visit"], function (_ctrlOrCmd, _uploads, _setupMirage, _wait, _testSupport, _mocha, _testHelpers, _chai, _fileUpload, _emberMocha, _visit) {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  (0, _mocha.describe)('Acceptance: Settings - General', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/settings/general');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/general');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/general');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as editor', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/general');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff');
    });
    (0, _mocha.describe)('when logged in', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('it renders, handles image uploads', async function () {
        await (0, _visit.visit)('/settings/general'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/general'); // has correct page title

        (0, _chai.expect)(document.title, 'page title').to.equal('Settings - General - Test Blog'); // highlights nav menu

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav="settings"]'), 'highlights nav menu item').to.have.class('active');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Save settings');
        await (0, _testHelpers.click)('[data-test-toggle-pub-info]');
        await (0, _testHelpers.fillIn)('[data-test-title-input]', 'New Blog Title');
        await (0, _testHelpers.click)('[data-test-save-button]');
        (0, _chai.expect)(document.title, 'page title').to.equal('Settings - General - New Blog Title'); // blog icon upload
        // -------------------------------------------------------------- //
        // has fixture icon

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-icon-img]').getAttribute('src'), 'initial icon src').to.equal('/content/images/2014/Feb/favicon.ico'); // delete removes icon + shows button

        await (0, _testHelpers.click)('[data-test-delete-image="icon"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-icon-img]'), 'icon img after removal').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-image-upload-btn="icon"]'), 'icon upload button after removal').to.exist; // select file

        (0, _fileUpload.fileUpload)('[data-test-file-input="icon"] input', ['test'], {
          name: 'pub-icon.ico',
          type: 'image/x-icon'
        }); // check progress bar exists during upload

        Ember.run.later(() => {
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="icon"] [data-test-progress-bar]'), 'icon upload progress bar').to.exist;
        }, 50); // wait for upload to finish and check image is shown

        await (0, _wait.default)();
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-icon-img]').getAttribute('src'), 'icon img after upload').to.match(/pub-icon\.ico$/);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-image-upload-btn="icon"]'), 'icon upload button after upload').to.not.exist; // failed upload shows error

        this.server.post('/images/upload/', function () {
          return {
            errors: [{
              type: 'ValidationError',
              message: 'Wrong icon size'
            }]
          };
        }, 422);
        await (0, _testHelpers.click)('[data-test-delete-image="icon"]');
        await (0, _fileUpload.fileUpload)('[data-test-file-input="icon"] input', ['test'], {
          name: 'pub-icon.ico',
          type: 'image/x-icon'
        });
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="icon"]').textContent.trim(), 'failed icon upload message').to.equal('Wrong icon size'); // reset upload endpoints

        (0, _uploads.default)(this.server); // blog logo upload
        // -------------------------------------------------------------- //
        // has fixture icon

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-logo-img]').getAttribute('src'), 'initial logo src').to.equal('/content/images/2013/Nov/logo.png'); // delete removes logo + shows button

        await (0, _testHelpers.click)('[data-test-delete-image="logo"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-logo-img]'), 'logo img after removal').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-image-upload-btn="logo"]'), 'logo upload button after removal').to.exist; // select file

        (0, _fileUpload.fileUpload)('[data-test-file-input="logo"] input', ['test'], {
          name: 'pub-logo.png',
          type: 'image/png'
        }); // check progress bar exists during upload

        Ember.run.later(() => {
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="logo"] [data-test-progress-bar]'), 'logo upload progress bar').to.exist;
        }, 50); // wait for upload to finish and check image is shown

        await (0, _wait.default)();
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-logo-img]').getAttribute('src'), 'logo img after upload').to.match(/pub-logo\.png$/);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-image-upload-btn="logo"]'), 'logo upload button after upload').to.not.exist; // failed upload shows error

        this.server.post('/images/upload/', function () {
          return {
            errors: [{
              type: 'ValidationError',
              message: 'Wrong logo size'
            }]
          };
        }, 422);
        await (0, _testHelpers.click)('[data-test-delete-image="logo"]');
        await (0, _fileUpload.fileUpload)('[data-test-file-input="logo"] input', ['test'], {
          name: 'pub-logo.png',
          type: 'image/png'
        });
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="logo"]').textContent.trim(), 'failed logo upload message').to.equal('Wrong logo size'); // reset upload endpoints

        (0, _uploads.default)(this.server); // blog cover upload
        // -------------------------------------------------------------- //
        // has fixture icon

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-cover-img]').getAttribute('src'), 'initial coverImage src').to.equal('/content/images/2014/Feb/cover.jpg'); // delete removes coverImage + shows button

        await (0, _testHelpers.click)('[data-test-delete-image="coverImage"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-coverImage-img]'), 'coverImage img after removal').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-image-upload-btn="coverImage"]'), 'coverImage upload button after removal').to.exist; // select file

        (0, _fileUpload.fileUpload)('[data-test-file-input="coverImage"] input', ['test'], {
          name: 'pub-coverImage.png',
          type: 'image/png'
        }); // check progress bar exists during upload

        Ember.run.later(() => {
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="coverImage"] [data-test-progress-bar]'), 'coverImage upload progress bar').to.exist;
        }, 50); // wait for upload to finish and check image is shown

        await (0, _wait.default)();
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-cover-img]').getAttribute('src'), 'coverImage img after upload').to.match(/pub-coverImage\.png$/);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-image-upload-btn="coverImage"]'), 'coverImage upload button after upload').to.not.exist; // failed upload shows error

        this.server.post('/images/upload/', function () {
          return {
            errors: [{
              type: 'ValidationError',
              message: 'Wrong coverImage size'
            }]
          };
        }, 422);
        await (0, _testHelpers.click)('[data-test-delete-image="coverImage"]');
        await (0, _fileUpload.fileUpload)('[data-test-file-input="coverImage"] input', ['test'], {
          name: 'pub-coverImage.png',
          type: 'image/png'
        });
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="coverImage"]').textContent.trim(), 'failed coverImage upload message').to.equal('Wrong coverImage size'); // reset upload endpoints

        (0, _uploads.default)(this.server); // CMD-S shortcut works
        // -------------------------------------------------------------- //

        await (0, _testHelpers.fillIn)('[data-test-title-input]', 'CMD-S Test');
        await (0, _testHelpers.triggerEvent)('.gh-app', 'keydown', {
          keyCode: 83,
          // s
          metaKey: _ctrlOrCmd.default === 'command',
          ctrlKey: _ctrlOrCmd.default === 'ctrl'
        }); // we've already saved in this test so there's no on-screen indication
        // that we've had another save, check the request was fired instead

        let _this$server$pretende = this.server.pretender.handledRequests.slice(-1),
            _this$server$pretende2 = _slicedToArray(_this$server$pretende, 1),
            lastRequest = _this$server$pretende2[0];

        let params = JSON.parse(lastRequest.requestBody);
        (0, _chai.expect)(params.settings.findBy('key', 'title').value).to.equal('CMD-S Test');
      });
      (0, _mocha.it)('renders timezone selector correctly', async function () {
        await (0, _visit.visit)('/settings/general');
        await (0, _testHelpers.click)('[data-test-toggle-timezone]');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/general');
        (0, _chai.expect)((0, _testHelpers.findAll)('#activeTimezone option').length, 'available timezones').to.equal(66);
        (0, _chai.expect)((0, _testHelpers.find)('#activeTimezone option:checked').textContent.trim()).to.equal('(GMT) UTC');
        (0, _testHelpers.find)('#activeTimezone option[value="Africa/Cairo"]').selected = true;
        await (0, _testHelpers.triggerEvent)('#activeTimezone', 'change');
        await (0, _testHelpers.click)('[data-test-save-button]');
        (0, _chai.expect)((0, _testHelpers.find)('#activeTimezone option:checked').textContent.trim()).to.equal('(GMT +2:00) Cairo, Egypt');
      });
      (0, _mocha.it)('handles private blog settings correctly', async function () {
        await (0, _visit.visit)('/settings/general'); // handles private blog settings correctly

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-private-checkbox]').checked, 'isPrivate checkbox').to.be.false;
        await (0, _testHelpers.click)('[data-test-private-checkbox]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-private-checkbox]').checked, 'isPrivate checkbox').to.be.true;
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-password-input]').length, 'password input').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-password-input]').value, 'password default value').to.not.equal('');
        await (0, _testHelpers.fillIn)('[data-test-password-input]', '');
        await (0, _testHelpers.blur)('[data-test-password-input]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-password-error]').textContent.trim(), 'empty password error').to.equal('Password must be supplied');
        await (0, _testHelpers.fillIn)('[data-test-password-input]', 'asdfg');
        await (0, _testHelpers.blur)('[data-test-password-input]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-password-error]').textContent.trim(), 'present password error').to.equal('');
      });
      (0, _mocha.it)('handles social blog settings correctly', async function () {
        let testSocialInput = async function testSocialInput(type, input, expectedValue) {
          let expectedError = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';
          await (0, _testHelpers.fillIn)("[data-test-".concat(type, "-input]"), input);
          await (0, _testHelpers.blur)("[data-test-".concat(type, "-input]"));
          (0, _chai.expect)((0, _testHelpers.find)("[data-test-".concat(type, "-input]")).value, "".concat(type, " value for ").concat(input)).to.equal(expectedValue);
          (0, _chai.expect)((0, _testHelpers.find)("[data-test-".concat(type, "-error]")).textContent.trim(), "".concat(type, " validation response for ").concat(input)).to.equal(expectedError);
          (0, _chai.expect)((0, _testHelpers.find)("[data-test-".concat(type, "-input]")).closest('.form-group').classList.contains('error'), "".concat(type, " input should be in error state with '").concat(input, "'")).to.equal(!!expectedError);
        };

        let testFacebookValidation = async function testFacebookValidation() {
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          return testSocialInput('facebook', ...args);
        };

        let testTwitterValidation = async function testTwitterValidation() {
          for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
          }

          return testSocialInput('twitter', ...args);
        };

        await (0, _visit.visit)('/settings/general');
        await (0, _testHelpers.click)('[data-test-toggle-social]'); // validates a facebook url correctly
        // loads fixtures and performs transform

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-facebook-input]').value, 'initial facebook value').to.equal('https://www.facebook.com/test');
        await (0, _testHelpers.focus)('[data-test-facebook-input]');
        await (0, _testHelpers.blur)('[data-test-facebook-input]'); // regression test: we still have a value after the input is
        // focused and then blurred without any changes

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-facebook-input]').value, 'facebook value after blur with no change').to.equal('https://www.facebook.com/test');
        await testFacebookValidation('facebook.com/username', 'https://www.facebook.com/username');
        await testFacebookValidation('testuser', 'https://www.facebook.com/testuser');
        await testFacebookValidation('ab99', 'https://www.facebook.com/ab99');
        await testFacebookValidation('page/ab99', 'https://www.facebook.com/page/ab99');
        await testFacebookValidation('page/*(&*(%%))', 'https://www.facebook.com/page/*(&*(%%))');
        await testFacebookValidation('facebook.com/pages/some-facebook-page/857469375913?ref=ts', 'https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts');
        await testFacebookValidation('https://www.facebook.com/groups/savethecrowninn', 'https://www.facebook.com/groups/savethecrowninn');
        await testFacebookValidation('http://github.com/username', 'http://github.com/username', 'The URL must be in a format like https://www.facebook.com/yourPage');
        await testFacebookValidation('http://github.com/pages/username', 'http://github.com/pages/username', 'The URL must be in a format like https://www.facebook.com/yourPage'); // validates a twitter url correctly
        // loads fixtures and performs transform

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-twitter-input]').value, 'initial twitter value').to.equal('https://twitter.com/test');
        await (0, _testHelpers.focus)('[data-test-twitter-input]');
        await (0, _testHelpers.blur)('[data-test-twitter-input]'); // regression test: we still have a value after the input is
        // focused and then blurred without any changes

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-twitter-input]').value, 'twitter value after blur with no change').to.equal('https://twitter.com/test');
        await testTwitterValidation('twitter.com/username', 'https://twitter.com/username');
        await testTwitterValidation('testuser', 'https://twitter.com/testuser');
        await testTwitterValidation('http://github.com/username', 'https://twitter.com/username');
        await testTwitterValidation('*(&*(%%))', '*(&*(%%))', 'The URL must be in a format like https://twitter.com/yourUsername');
        await testTwitterValidation('thisusernamehasmorethan15characters', 'thisusernamehasmorethan15characters', 'Your Username is not a valid Twitter Username');
      });
      (0, _mocha.it)('warns when leaving without saving', async function () {
        await (0, _visit.visit)('/settings/general');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-private-checkbox]').checked, 'private blog checkbox').to.be.false;
        await (0, _testHelpers.click)('[data-test-toggle-pub-info]');
        await (0, _testHelpers.fillIn)('[data-test-title-input]', 'New Blog Title');
        await (0, _testHelpers.click)('[data-test-private-checkbox]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-private-checkbox]').checked, 'private blog checkbox').to.be.true;
        await (0, _visit.visit)('/settings/staff');
        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal').length, 'modal exists').to.equal(1); // Leave without saving

        await (0, _testHelpers.click)('.fullscreen-modal [data-test-leave-button]');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/staff');
        await (0, _visit.visit)('/settings/general');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/general'); // settings were not saved

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-private-checkbox]').checked, 'private blog checkbox').to.be.false;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-title-input]').textContent.trim(), 'Blog title').to.equal('');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/integrations-test", ["ember-cli-mirage/test-support/setup-mirage", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ghost-admin/tests/helpers/visit"], function (_setupMirage, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Settings - Integrations - Custom', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.describe)('access permissions', function () {
      (0, _mocha.beforeEach)(function () {
        this.server.create('integration', {
          name: 'Test'
        });
      });
      (0, _mocha.it)('redirects /integrations/ to signin when not authenticated', async function () {
        await (0, _testSupport.invalidateSession)();
        await (0, _visit.visit)('/settings/integrations');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
      });
      (0, _mocha.it)('redirects /integrations/ to staff page when authenticated as contributor', async function () {
        let role = this.server.create('role', {
          name: 'Contributor'
        });
        this.server.create('user', {
          roles: [role],
          slug: 'test-user'
        });
        await (0, _testSupport.authenticateSession)();
        await (0, _visit.visit)('/settings/integrations');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
      });
      (0, _mocha.it)('redirects /integrations/ to staff page when authenticated as author', async function () {
        let role = this.server.create('role', {
          name: 'Author'
        });
        this.server.create('user', {
          roles: [role],
          slug: 'test-user'
        });
        await (0, _testSupport.authenticateSession)();
        await (0, _visit.visit)('/settings/integrations');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
      });
      (0, _mocha.it)('redirects /integrations/ to staff page when authenticated as editor', async function () {
        let role = this.server.create('role', {
          name: 'Editor'
        });
        this.server.create('user', {
          roles: [role],
          slug: 'test-user'
        });
        await (0, _testSupport.authenticateSession)();
        await (0, _visit.visit)('/settings/integrations/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff');
      });
      (0, _mocha.it)('redirects /integrations/:id/ to signin when not authenticated', async function () {
        await (0, _testSupport.invalidateSession)();
        await (0, _visit.visit)('/settings/integrations/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
      });
      (0, _mocha.it)('redirects /integrations/:id/ to staff page when authenticated as contributor', async function () {
        let role = this.server.create('role', {
          name: 'Contributor'
        });
        this.server.create('user', {
          roles: [role],
          slug: 'test-user'
        });
        await (0, _testSupport.authenticateSession)();
        await (0, _visit.visit)('/settings/integrations/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
      });
      (0, _mocha.it)('redirects /integrations/:id/ to staff page when authenticated as author', async function () {
        let role = this.server.create('role', {
          name: 'Author'
        });
        this.server.create('user', {
          roles: [role],
          slug: 'test-user'
        });
        await (0, _testSupport.authenticateSession)();
        await (0, _visit.visit)('/settings/integrations/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
      });
      (0, _mocha.it)('redirects /integrations/:id/ to staff page when authenticated as editor', async function () {
        let role = this.server.create('role', {
          name: 'Editor'
        });
        this.server.create('user', {
          roles: [role],
          slug: 'test-user'
        });
        await (0, _testSupport.authenticateSession)();
        await (0, _visit.visit)('/settings/integrations/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff');
      });
    });
    (0, _mocha.describe)('navigation', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('renders correctly', async function () {
        await (0, _visit.visit)('/settings/integrations'); // slack is not configured in the fixtures

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-app="slack"] [data-test-app-status]').textContent.trim(), 'slack app status').to.equal('Configure'); // amp is enabled in the fixtures

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-app="amp"] [data-test-app-status]').textContent.trim(), 'amp app status').to.equal('Active');
      });
      (0, _mocha.it)('it redirects to Slack when clicking on the grid', async function () {
        await (0, _visit.visit)('/settings/integrations'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations');
        await (0, _testHelpers.click)('[data-test-link="slack"]'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/slack');
      });
      (0, _mocha.it)('it redirects to AMP when clicking on the grid', async function () {
        await (0, _visit.visit)('/settings/integrations'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations');
        await (0, _testHelpers.click)('[data-test-link="amp"]'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/amp');
      });
      (0, _mocha.it)('it redirects to Unsplash when clicking on the grid', async function () {
        await (0, _visit.visit)('/settings/integrations'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations');
        await (0, _testHelpers.click)('[data-test-link="unsplash"]'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/unsplash');
      });
    });
    (0, _mocha.describe)('custom integrations', function () {
      (0, _mocha.beforeEach)(async function () {
        this.server.loadFixtures('configs');
        let config = this.server.schema.configs.first();
        config.update({
          enableDeveloperExperiments: true
        });
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('handles 404', async function () {
        await (0, _visit.visit)('/settings/integrations/1');
        (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('error404');
      });
      (0, _mocha.it)('can add new integration', async function () {
        // sanity check
        (0, _chai.expect)(this.server.db.integrations.length, 'number of integrations in db at start').to.equal(0);
        (0, _chai.expect)(this.server.db.apiKeys.length, 'number of apiKeys in db at start').to.equal(0); // blank slate

        await (0, _visit.visit)('/settings/integrations');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-blank="custom-integrations"]'), 'initial blank slate').to.exist; // new integration modal opens/closes

        await (0, _testHelpers.click)('[data-test-button="new-integration"]');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after clicking new').to.equal('/settings/integrations/new');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="new-integration"]'), 'modal after clicking new').to.exist;
        await (0, _testHelpers.click)('[data-test-button="cancel-new-integration"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="new-integration"]'), 'modal after clicking cancel').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-blank="custom-integrations"]'), 'blank slate after cancelled creation').to.exist; // new integration validations

        await (0, _testHelpers.click)('[data-test-button="new-integration"]');
        await (0, _testHelpers.click)('[data-test-button="create-integration"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="new-integration-name"]').textContent, 'name error after create with blank field').to.have.string('enter a name');
        await (0, _testHelpers.fillIn)('[data-test-input="new-integration-name"]', 'Duplicate');
        await (0, _testHelpers.click)('[data-test-button="create-integration"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="new-integration-name"]').textContent, 'name error after create with duplicate name').to.have.string('already been used'); // successful creation

        await (0, _testHelpers.fillIn)('[data-test-input="new-integration-name"]', 'Test');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="new-integration-name"]').textContent.trim(), 'name error after typing in field').to.be.empty;
        await (0, _testHelpers.click)('[data-test-button="create-integration"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="new-integration"]'), 'modal after successful create').to.not.exist;
        (0, _chai.expect)(this.server.db.integrations.length, 'number of integrations in db after create').to.equal(1); // mirage sanity check

        (0, _chai.expect)(this.server.db.apiKeys.length, 'number of api keys in db after create').to.equal(2);
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after integration creation').to.equal('/settings/integrations/1'); // test navigation back to list then back to new integration

        await (0, _testHelpers.click)('[data-test-link="integrations-back"]');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after clicking "Back"').to.equal('/settings/integrations');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-blank="custom-integrations"]'), 'blank slate after creation').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-custom-integration]').length, 'number of custom integrations after creation').to.equal(1);
        await (0, _testHelpers.click)("[data-test-integration=\"1\"]");
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after clicking integration in list').to.equal('/settings/integrations/1');
      });
      (0, _mocha.it)('can manage an integration', async function () {
        this.server.create('integration');
        await (0, _visit.visit)('/settings/integrations/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'initial URL').to.equal('/settings/integrations/1');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-screen-title]').textContent, 'screen title').to.have.string('Integration 1'); // fields have expected values
        // TODO: add test for logo

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="name"]').value, 'initial name value').to.equal('Integration 1');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="description"]').value, 'initial description value').to.equal('');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="content-key"]'), 'content key text').to.have.trimmed.text('integration-1_content_key-12345');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="admin-key"]'), 'admin key text').to.have.trimmed.text('integration-1_admin_key-12345');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="api-url"]'), 'api url text').to.have.trimmed.text(window.location.origin); // it can modify integration fields and has validation

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="name"]').textContent.trim(), 'initial name error').to.be.empty;
        await (0, _testHelpers.fillIn)('[data-test-input="name"]', '');
        await (0, _testHelpers.triggerEvent)('[data-test-input="name"]', 'blur');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="name"]').textContent, 'name validation for blank string').to.have.string('enter a name');
        await (0, _testHelpers.click)('[data-test-button="save"]');
        (0, _chai.expect)(this.server.schema.integrations.first().name, 'db integration name after failed save').to.equal('Integration 1');
        await (0, _testHelpers.fillIn)('[data-test-input="name"]', 'Test Integration');
        await (0, _testHelpers.triggerEvent)('[data-test-input="name"]', 'blur');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="name"]').textContent.trim(), 'name error after valid entry').to.be.empty;
        await (0, _testHelpers.fillIn)('[data-test-input="description"]', 'Description for Test Integration');
        await (0, _testHelpers.triggerEvent)('[data-test-input="description"]', 'blur');
        await (0, _testHelpers.click)('[data-test-button="save"]'); // changes are reflected in the integrations list

        await (0, _testHelpers.click)('[data-test-link="integrations-back"]');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after saving and clicking "back"').to.equal('/settings/integrations');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-integration="1"] [data-test-text="name"]').textContent.trim(), 'integration name after save').to.equal('Test Integration');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-integration="1"] [data-test-text="description"]').textContent.trim(), 'integration description after save').to.equal('Description for Test Integration');
        await (0, _testHelpers.click)('[data-test-integration="1"]'); // warns of unsaved changes when leaving

        await (0, _testHelpers.fillIn)('[data-test-input="name"]', 'Unsaved test');
        await (0, _testHelpers.click)('[data-test-link="integrations-back"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="unsaved-settings"]'), 'modal shown when navigating with unsaved changes').to.exist;
        await (0, _testHelpers.click)('[data-test-stay-button]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="unsaved-settings"]'), 'modal is closed after clicking "stay"').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after clicking "stay"').to.equal('/settings/integrations/1');
        await (0, _testHelpers.click)('[data-test-link="integrations-back"]');
        await (0, _testHelpers.click)('[data-test-leave-button]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="unsaved-settings"]'), 'modal is closed after clicking "leave"').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after clicking "leave"').to.equal('/settings/integrations');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-integration="1"] [data-test-text="name"]').textContent.trim(), 'integration name after leaving unsaved changes').to.equal('Test Integration');
      });
      (0, _mocha.it)('can manage an integration\'s webhooks', async function () {
        this.server.create('integration');
        await (0, _visit.visit)('/settings/integrations/1');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-webhooks-blank-slate]')).to.exist; // open new webhook modal

        await (0, _testHelpers.click)('[data-test-link="add-webhook"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="webhook-form"]')).to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="webhook-form"] [data-test-text="title"]').textContent).to.have.string('New webhook'); // can cancel new webhook

        await (0, _testHelpers.click)('[data-test-button="cancel-webhook"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="webhook-form"]')).to.not.exist; // create new webhook

        await (0, _testHelpers.click)('[data-test-link="add-webhook"]');
        await (0, _testHelpers.fillIn)('[data-test-input="webhook-name"]', 'First webhook');
        await (0, _testHelpers.fillIn)('[data-test-select="webhook-event"]', 'site.changed');
        await (0, _testHelpers.fillIn)('[data-test-input="webhook-targetUrl"]', 'https://example.com/first-webhook');
        await (0, _testHelpers.click)('[data-test-button="save-webhook"]'); // modal closed and 1 webhook listed with correct details

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="webhook-form"]')).to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-webhook-row]')).to.exist;
        let row = (0, _testHelpers.find)('[data-test-webhook-row="1"]');
        (0, _chai.expect)(row.querySelector('[data-test-text="name"]').textContent).to.have.string('First webhook');
        (0, _chai.expect)(row.querySelector('[data-test-text="event"]').textContent).to.have.string('Site changed (rebuild)');
        (0, _chai.expect)(row.querySelector('[data-test-text="targetUrl"]').textContent).to.have.string('https://example.com/first-webhook');
        (0, _chai.expect)(row.querySelector('[data-test-text="last-triggered"]').textContent).to.have.string('Not triggered'); // click edit webhook link

        await (0, _testHelpers.click)('[data-test-webhook-row="1"] [data-test-link="edit-webhook"]'); // modal appears and has correct title

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="webhook-form"]')).to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="webhook-form"] [data-test-text="title"]').textContent).to.have.string('Edit webhook');
      }); // test to ensure the `value=description` passed to `gh-text-input` is `readonly`

      (0, _mocha.it)('doesn\'t show unsaved changes modal after placing focus on description field', async function () {
        this.server.create('integration');
        await (0, _visit.visit)('/settings/integrations/1');
        await (0, _testHelpers.click)('[data-test-input="description"]');
        await (0, _testHelpers.triggerEvent)('[data-test-input="description"]', 'blur');
        await (0, _testHelpers.click)('[data-test-link="integrations-back"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="unsaved-settings"]'), 'unsaved changes modal is not shown').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/settings/integrations');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/labs-test", ["ember-cli-mirage/test-support/setup-mirage", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ghost-admin/tests/helpers/file-upload", "ember-mocha", "ghost-admin/tests/helpers/visit"], function (_setupMirage, _testSupport, _mocha, _testHelpers, _chai, _fileUpload, _emberMocha, _visit) {
  "use strict";

  // import wait from 'ember-test-helpers/wait';
  // import {timeout} from 'ember-concurrency';
  (0, _mocha.describe)('Acceptance: Settings - Labs', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/settings/labs');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/labs');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/labs');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as editor', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/labs');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff');
    });
    (0, _mocha.describe)('when logged in', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });

      _mocha.it.skip('it renders, loads modals correctly', async function () {
        await (0, _visit.visit)('/settings/labs'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/labs'); // has correct page title

        (0, _chai.expect)(document.title, 'page title').to.equal('Settings - Labs - Test Blog'); // highlights nav menu

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav="labs"]'), 'highlights nav menu item').to.have.class('active');
        await (0, _testHelpers.click)('#settings-resetdb .js-delete');
        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal .modal-content').length, 'modal element').to.equal(1);
        await (0, _testHelpers.click)('.fullscreen-modal .modal-footer .gh-btn');
        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal').length, 'modal element').to.equal(0);
      });

      (0, _mocha.it)('can upload/download redirects', async function () {
        await (0, _visit.visit)('/settings/labs'); // successful upload

        this.server.post('/redirects/json/', {}, 200);
        await (0, _fileUpload.fileUpload)('[data-test-file-input="redirects"] input', ['test'], {
          name: 'redirects.json',
          type: 'application/json'
        }); // TODO: tests for the temporary success/failure state have been
        // disabled because they were randomly failing
        // this should be half-way through button reset timeout
        // await timeout(50);
        //
        // // shows success button
        // let buttons = findAll('[data-test-button="upload-redirects"]');
        // expect(buttons.length, 'no of success buttons').to.equal(1);
        // expect(
        //     buttons[0],
        //     'success button is green'
        // ).to.have.class('gh-btn-green);
        // expect(
        //     button.textContent,
        //     'success button text'
        // ).to.have.string('Uploaded');
        //
        // await wait();
        // returned to normal button

        let buttons = (0, _testHelpers.findAll)('[data-test-button="upload-redirects"]');
        (0, _chai.expect)(buttons.length, 'no of post-success buttons').to.equal(1);
        (0, _chai.expect)(buttons[0], 'post-success button doesn\'t have success class').to.not.have.class('gh-btn-green');
        (0, _chai.expect)(buttons[0].textContent, 'post-success button text').to.have.string('Upload redirects'); // failed upload

        this.server.post('/redirects/json/', {
          errors: [{
            type: 'BadRequestError',
            message: 'Test failure message'
          }]
        }, 400);
        await (0, _fileUpload.fileUpload)('[data-test-file-input="redirects"] input', ['test'], {
          name: 'redirects-bad.json',
          type: 'application/json'
        }); // TODO: tests for the temporary success/failure state have been
        // disabled because they were randomly failing
        // this should be half-way through button reset timeout
        // await timeout(50);
        //
        // shows failure button
        // buttons = findAll('[data-test-button="upload-redirects"]');
        // expect(buttons.length, 'no of failure buttons').to.equal(1);
        // expect(
        //     buttons[0],
        //     'failure button is red'
        // ).to.have.class('gh-btn-red);
        // expect(
        //     buttons[0].textContent,
        //     'failure button text'
        // ).to.have.string('Upload Failed');
        //
        // await wait();
        // shows error message

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="redirects"]').textContent.trim(), 'upload error text').to.have.string('Test failure message'); // returned to normal button

        buttons = (0, _testHelpers.findAll)('[data-test-button="upload-redirects"]');
        (0, _chai.expect)(buttons.length, 'no of post-failure buttons').to.equal(1);
        (0, _chai.expect)(buttons[0], 'post-failure button doesn\'t have failure class').to.not.have.class('gh-btn-red');
        (0, _chai.expect)(buttons[0].textContent, 'post-failure button text').to.have.string('Upload redirects'); // successful upload clears error

        this.server.post('/redirects/json/', {}, 200);
        await (0, _fileUpload.fileUpload)('[data-test-file-input="redirects"] input', ['test'], {
          name: 'redirects-bad.json',
          type: 'application/json'
        });
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="redirects"]')).to.not.exist; // can download redirects.json

        await (0, _testHelpers.click)('[data-test-link="download-redirects"]');
        let iframe = document.querySelector('#iframeDownload');
        (0, _chai.expect)(iframe.getAttribute('src')).to.have.string('/redirects/json/');
      });
      (0, _mocha.it)('can upload/download routes.yaml', async function () {
        await (0, _visit.visit)('/settings/labs'); // successful upload

        this.server.post('/settings/routes/yaml/', {}, 200);
        await (0, _fileUpload.fileUpload)('[data-test-file-input="routes"] input', ['test'], {
          name: 'routes.yaml',
          type: 'application/x-yaml'
        }); // TODO: tests for the temporary success/failure state have been
        // disabled because they were randomly failing
        // this should be half-way through button reset timeout
        // await timeout(50);
        //
        // // shows success button
        // let button = find('[data-test-button="upload-routes"]');
        // expect(button.length, 'no of success buttons').to.equal(1);
        // expect(
        //     button.hasClass('gh-btn-green'),
        //     'success button is green'
        // ).to.be.true;
        // expect(
        //     button.text().trim(),
        //     'success button text'
        // ).to.have.string('Uploaded');
        //
        // await wait();
        // returned to normal button

        let buttons = (0, _testHelpers.findAll)('[data-test-button="upload-routes"]');
        (0, _chai.expect)(buttons.length, 'no of post-success buttons').to.equal(1);
        (0, _chai.expect)(buttons[0], 'routes post-success button doesn\'t have success class').to.not.have.class('gh-btn-green');
        (0, _chai.expect)(buttons[0].textContent, 'routes post-success button text').to.have.string('Upload routes YAML'); // failed upload

        this.server.post('/settings/routes/yaml/', {
          errors: [{
            type: 'BadRequestError',
            message: 'Test failure message'
          }]
        }, 400);
        await (0, _fileUpload.fileUpload)('[data-test-file-input="routes"] input', ['test'], {
          name: 'routes-bad.yaml',
          type: 'application/x-yaml'
        }); // TODO: tests for the temporary success/failure state have been
        // disabled because they were randomly failing
        // this should be half-way through button reset timeout
        // await timeout(50);
        //
        // shows failure button
        // button = find('[data-test-button="upload-routes"]');
        // expect(button.length, 'no of failure buttons').to.equal(1);
        // expect(
        //     button.hasClass('gh-btn-red'),
        //     'failure button is red'
        // ).to.be.true;
        // expect(
        //     button.text().trim(),
        //     'failure button text'
        // ).to.have.string('Upload Failed');
        //
        // await wait();
        // shows error message

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="routes"]').textContent, 'routes upload error text').to.have.string('Test failure message'); // returned to normal button

        buttons = (0, _testHelpers.findAll)('[data-test-button="upload-routes"]');
        (0, _chai.expect)(buttons.length, 'no of post-failure buttons').to.equal(1);
        (0, _chai.expect)(buttons[0], 'routes post-failure button doesn\'t have failure class').to.not.have.class('gh-btn-red');
        (0, _chai.expect)(buttons[0].textContent, 'routes post-failure button text').to.have.string('Upload routes YAML'); // successful upload clears error

        this.server.post('/settings/routes/yaml/', {}, 200);
        await (0, _fileUpload.fileUpload)('[data-test-file-input="routes"] input', ['test'], {
          name: 'routes-good.yaml',
          type: 'application/x-yaml'
        });
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="routes"]')).to.not.exist; // can download redirects.json

        await (0, _testHelpers.click)('[data-test-link="download-routes"]');
        let iframe = document.querySelector('#iframeDownload');
        (0, _chai.expect)(iframe.getAttribute('src')).to.have.string('/settings/routes/yaml/');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/slack-test", ["ember-cli-mirage", "ghost-admin/utils/ctrl-or-cmd", "ember-cli-mirage/test-support/setup-mirage", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ghost-admin/tests/helpers/visit"], function (_emberCliMirage, _ctrlOrCmd, _setupMirage, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _visit) {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  (0, _mocha.describe)('Acceptance: Settings - Integrations - Slack', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/settings/integrations/slack');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/slack');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/slack');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as editor', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/slack');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff');
    });
    (0, _mocha.describe)('when logged in', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('it validates and saves slack settings properly', async function () {
        await (0, _visit.visit)('/settings/integrations/slack'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/slack');
        await (0, _testHelpers.fillIn)('[data-test-slack-url-input]', 'notacorrecturl');
        await (0, _testHelpers.click)('[data-test-save-button]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="slack-url"]').textContent.trim(), 'inline validation response').to.equal('The URL must be in a format like https://hooks.slack.com/services/<your personal key>'); // CMD-S shortcut works

        await (0, _testHelpers.fillIn)('[data-test-slack-url-input]', 'https://hooks.slack.com/services/1275958430');
        await (0, _testHelpers.fillIn)('[data-test-slack-username-input]', 'SlackBot');
        await (0, _testHelpers.triggerEvent)('.gh-app', 'keydown', {
          keyCode: 83,
          // s
          metaKey: _ctrlOrCmd.default === 'command',
          ctrlKey: _ctrlOrCmd.default === 'ctrl'
        });

        let _this$server$pretende = this.server.pretender.handledRequests.slice(-1),
            _this$server$pretende2 = _slicedToArray(_this$server$pretende, 1),
            newRequest = _this$server$pretende2[0];

        let params = JSON.parse(newRequest.requestBody);

        let _JSON$parse = JSON.parse(params.settings.findBy('key', 'slack').value),
            _JSON$parse2 = _slicedToArray(_JSON$parse, 1),
            result = _JSON$parse2[0];

        (0, _chai.expect)(result.url).to.equal('https://hooks.slack.com/services/1275958430');
        (0, _chai.expect)(result.username).to.equal('SlackBot');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="slack-url"]'), 'inline validation response').to.not.exist;
        await (0, _testHelpers.fillIn)('[data-test-slack-url-input]', 'https://hooks.slack.com/services/1275958430');
        await (0, _testHelpers.click)('[data-test-send-notification-button]');
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-notification').length, 'number of notifications').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="slack-url"]'), 'inline validation response').to.not.exist;
        this.server.put('/settings/', function () {
          return new _emberCliMirage.default.Response(422, {}, {
            errors: [{
              type: 'ValidationError',
              message: 'Test error'
            }]
          });
        });
        await (0, _testHelpers.click)('.gh-notification .gh-notification-close');
        await (0, _testHelpers.click)('[data-test-send-notification-button]'); // we shouldn't try to send the test request if the save fails

        let _this$server$pretende3 = this.server.pretender.handledRequests.slice(-1),
            _this$server$pretende4 = _slicedToArray(_this$server$pretende3, 1),
            lastRequest = _this$server$pretende4[0];

        (0, _chai.expect)(lastRequest.url).to.not.match(/\/slack\/test/);
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-notification').length, 'check slack notification after api validation error').to.equal(0);
      });
      (0, _mocha.it)('warns when leaving without saving', async function () {
        await (0, _visit.visit)('/settings/integrations/slack'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/slack');
        await (0, _testHelpers.fillIn)('[data-test-slack-url-input]', 'https://hooks.slack.com/services/1275958430');
        await (0, _testHelpers.blur)('[data-test-slack-url-input]');
        await (0, _visit.visit)('/settings/design');
        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal').length, 'modal exists').to.equal(1); // Leave without saving

        await (0, _testHelpers.click)('.fullscreen-modal [data-test-leave-button]');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/design');
        await (0, _visit.visit)('/settings/integrations/slack');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/slack'); // settings were not saved

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-slack-url-input]').textContent.trim(), 'Slack Webhook URL').to.equal('');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/tags-test", ["ember-cli-mirage/test-support/setup-mirage", "ember-test-helpers/wait", "ghost-admin/utils/window-proxy", "ember-cli-mirage", "mocha", "ember-simple-auth/test-support", "@ember/test-helpers", "ghost-admin/tests/helpers/adapter-error", "chai", "ember-mocha", "ember-concurrency", "ghost-admin/tests/helpers/visit"], function (_setupMirage, _wait, _windowProxy, _emberCliMirage, _mocha, _testSupport, _testHelpers, _adapterError, _chai, _emberMocha, _emberConcurrency, _visit) {
  "use strict";

  // Grabbed from keymaster's testing code because Ember's `keyEvent` helper
  // is for some reason not triggering the events in a way that keymaster detects:
  // https://github.com/madrobby/keymaster/blob/master/test/keymaster.html#L31
  const modifierMap = {
    16: 'shiftKey',
    18: 'altKey',
    17: 'ctrlKey',
    91: 'metaKey'
  };

  let keydown = function keydown(code, modifiers, el) {
    let event = document.createEvent('Event');
    event.initEvent('keydown', true, true);
    event.keyCode = code;

    if (modifiers && modifiers.length > 0) {
      for (let i in modifiers) {
        event[modifierMap[modifiers[i]]] = true;
      }
    }

    (el || document).dispatchEvent(event);
  };

  let keyup = function keyup(code, el) {
    let event = document.createEvent('Event');
    event.initEvent('keyup', true, true);
    event.keyCode = code;
    (el || document).dispatchEvent(event);
  };

  (0, _mocha.describe)('Acceptance: Settings - Tags', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/settings/tags');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/signin');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/design');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/design');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.describe)('when logged in', function () {
      let newLocation, originalReplaceState;
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        originalReplaceState = _windowProxy.default.replaceState;

        _windowProxy.default.replaceState = function (params, title, url) {
          newLocation = url;
        };

        newLocation = undefined;
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.afterEach)(function () {
        _windowProxy.default.replaceState = originalReplaceState;
      });
      (0, _mocha.it)('it renders, can be navigated, can edit, create & delete tags', async function () {
        let tag1 = this.server.create('tag');
        let tag2 = this.server.create('tag');
        await (0, _visit.visit)('/settings/tags'); // second wait is needed for the vertical-collection to settle

        await (0, _wait.default)(); // it redirects to first tag

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal("/settings/tags/".concat(tag1.slug)); // it has correct page title

        (0, _chai.expect)(document.title, 'page title').to.equal('Settings - Tags - Test Blog'); // it highlights nav menu

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav="tags"]'), 'highlights nav menu item').to.have.class('active'); // it lists all tags

        (0, _chai.expect)((0, _testHelpers.findAll)('.settings-tags .settings-tag').length, 'tag list count').to.equal(2);
        let tag = (0, _testHelpers.find)('.settings-tags .settings-tag');
        (0, _chai.expect)(tag.querySelector('.tag-title').textContent, 'tag list item title').to.equal(tag1.name); // it highlights selected tag

        (0, _chai.expect)((0, _testHelpers.find)("a[href=\"/ghost/settings/tags/".concat(tag1.slug, "\"]")), 'highlights selected tag').to.have.class('active'); // it shows selected tag form

        (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane h4').textContent, 'settings pane title').to.equal('Tag settings');
        (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane input[name="name"]').value, 'loads correct tag into form').to.equal(tag1.name); // click the second tag in the list

        let tagEditButtons = (0, _testHelpers.findAll)('.tag-edit-button');
        await (0, _testHelpers.click)(tagEditButtons[tagEditButtons.length - 1]); // it navigates to selected tag

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after clicking tag').to.equal("/settings/tags/".concat(tag2.slug)); // it highlights selected tag

        (0, _chai.expect)((0, _testHelpers.find)("a[href=\"/ghost/settings/tags/".concat(tag2.slug, "\"]")), 'highlights selected tag').to.have.class('active'); // it shows selected tag form

        (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane input[name="name"]').value, 'loads correct tag into form').to.equal(tag2.name); // simulate up arrow press

        Ember.run(() => {
          keydown(38);
          keyup(38);
        });
        await (0, _wait.default)(); // it navigates to previous tag

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after keyboard up arrow').to.equal("/settings/tags/".concat(tag1.slug)); // it highlights selected tag

        (0, _chai.expect)((0, _testHelpers.find)("a[href=\"/ghost/settings/tags/".concat(tag1.slug, "\"]")), 'selects previous tag').to.have.class('active'); // simulate down arrow press

        Ember.run(() => {
          keydown(40);
          keyup(40);
        });
        await (0, _wait.default)(); // it navigates to previous tag

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after keyboard down arrow').to.equal("/settings/tags/".concat(tag2.slug)); // it highlights selected tag

        (0, _chai.expect)((0, _testHelpers.find)("a[href=\"/ghost/settings/tags/".concat(tag2.slug, "\"]")), 'selects next tag').to.have.class('active'); // trigger save

        await (0, _testHelpers.fillIn)('.tag-settings-pane input[name="name"]', 'New Name');
        await (0, _testHelpers.blur)('.tag-settings-pane input[name="name"]'); // extra timeout needed for Travis - sometimes it doesn't update
        // quick enough and an extra wait() call doesn't help

        await (0, _emberConcurrency.timeout)(100); // check we update with the data returned from the server

        let tags = (0, _testHelpers.findAll)('.settings-tags .settings-tag');
        tag = tags[0];
        (0, _chai.expect)(tag.querySelector('.tag-title').textContent, 'tag list updates on save').to.equal('New Name');
        (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane input[name="name"]').value, 'settings form updates on save').to.equal('New Name'); // start new tag

        await (0, _testHelpers.click)('.view-actions .gh-btn-green'); // it navigates to the new tag route

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'new tag URL').to.equal('/settings/tags/new'); // it displays the new tag form

        (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane h4').textContent, 'settings pane title').to.equal('New tag'); // all fields start blank

        (0, _testHelpers.findAll)('.tag-settings-pane input, .tag-settings-pane textarea').forEach(function (elem) {
          (0, _chai.expect)(elem.value, "input field for ".concat(elem.getAttribute('name'))).to.be.empty;
        }); // save new tag

        await (0, _testHelpers.fillIn)('.tag-settings-pane input[name="name"]', 'New tag');
        await (0, _testHelpers.blur)('.tag-settings-pane input[name="name"]'); // extra timeout needed for FF on Linux - sometimes it doesn't update
        // quick enough, especially on Travis, and an extra wait() call
        // doesn't help

        await (0, _emberConcurrency.timeout)(100); // it redirects to the new tag's URL

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'URL after tag creation').to.equal('/settings/tags/new-tag'); // it adds the tag to the list and selects

        tags = (0, _testHelpers.findAll)('.settings-tags .settings-tag');
        tag = tags[1]; // second tag in list due to alphabetical ordering

        (0, _chai.expect)(tags.length, 'tag list count after creation').to.equal(3); // new tag will be second in the list due to alphabetical sorting

        (0, _chai.expect)((0, _testHelpers.findAll)('.settings-tags .settings-tag')[1].querySelector('.tag-title').textContent.trim(), 'new tag list item title');
        (0, _chai.expect)(tag.querySelector('.tag-title').textContent, 'new tag list item title').to.equal('New tag');
        (0, _chai.expect)((0, _testHelpers.find)('a[href="/ghost/settings/tags/new-tag"]'), 'highlights new tag').to.have.class('active'); // delete tag

        await (0, _testHelpers.click)('.settings-menu-delete-button');
        await (0, _testHelpers.click)('.fullscreen-modal .gh-btn-red'); // it redirects to the first tag

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'URL after tag deletion').to.equal("/settings/tags/".concat(tag1.slug)); // it removes the tag from the list

        (0, _chai.expect)((0, _testHelpers.findAll)('.settings-tags .settings-tag').length, 'tag list count after deletion').to.equal(2);
      }); // TODO: Unskip and fix
      // skipped because it was failing most of the time on Travis
      // see https://github.com/TryGhost/Ghost/issues/8805

      _mocha.it.skip('loads tag via slug when accessed directly', async function () {
        this.server.createList('tag', 2);
        await (0, _visit.visit)('/settings/tags/tag-1'); // second wait is needed for the vertical-collection to settle

        await (0, _wait.default)();
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'URL after direct load').to.equal('/settings/tags/tag-1'); // it loads all other tags

        (0, _chai.expect)((0, _testHelpers.findAll)('.settings-tags .settings-tag').length, 'tag list count after direct load').to.equal(2); // selects tag in list

        (0, _chai.expect)((0, _testHelpers.find)('a[href="/ghost/settings/tags/tag-1"]').classList.contains('active'), 'highlights requested tag').to.be.true; // shows requested tag in settings pane

        (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane input[name="name"]').value, 'loads correct tag into form').to.equal('Tag 1');
      });

      (0, _mocha.it)('shows the internal tag label', async function () {
        this.server.create('tag', {
          name: '#internal-tag',
          slug: 'hash-internal-tag',
          visibility: 'internal'
        });
        await (0, _visit.visit)('settings/tags/'); // second wait is needed for the vertical-collection to settle

        await (0, _wait.default)();
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/settings/tags/hash-internal-tag');
        (0, _chai.expect)((0, _testHelpers.findAll)('.settings-tags .settings-tag').length, 'tag list count').to.equal(1);
        let tag = (0, _testHelpers.find)('.settings-tags .settings-tag');
        (0, _chai.expect)(tag.querySelectorAll('.label.label-blue').length, 'internal tag label').to.equal(1);
        (0, _chai.expect)(tag.querySelector('.label.label-blue').textContent.trim(), 'internal tag label text').to.equal('internal');
      });
      (0, _mocha.it)('updates the URL when slug changes', async function () {
        this.server.createList('tag', 2);
        await (0, _visit.visit)('/settings/tags/tag-1'); // second wait is needed for the vertical-collection to settle

        await (0, _wait.default)();
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'URL after direct load').to.equal('/settings/tags/tag-1'); // update the slug

        await (0, _testHelpers.fillIn)('.tag-settings-pane input[name="slug"]', 'test');
        await (0, _testHelpers.blur)('.tag-settings-pane input[name="slug"]'); // tests don't have a location.hash so we can only check that the
        // slug portion is updated correctly

        (0, _chai.expect)(newLocation, 'URL after slug change').to.equal('test');
      });
      (0, _mocha.it)('redirects to 404 when tag does not exist', async function () {
        this.server.get('/tags/slug/unknown/', function () {
          return new _emberCliMirage.Response(404, {
            'Content-Type': 'application/json'
          }, {
            errors: [{
              message: 'Tag not found.',
              type: 'NotFoundError'
            }]
          });
        });
        (0, _adapterError.errorOverride)();
        await (0, _visit.visit)('settings/tags/unknown');
        (0, _adapterError.errorReset)();
        (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('error404');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/settings/tags/unknown');
      });
      (0, _mocha.it)('sorts tags correctly', async function () {
        this.server.create('tag', {
          name: 'B - Third',
          slug: 'third'
        });
        this.server.create('tag', {
          name: 'Z - Last',
          slug: 'last'
        });
        this.server.create('tag', {
          name: '#A - Second',
          slug: 'second'
        });
        this.server.create('tag', {
          name: 'A - First',
          slug: 'first'
        });
        await (0, _visit.visit)('settings/tags'); // second wait is needed for the vertical-collection to settle

        await (0, _wait.default)();
        let tags = (0, _testHelpers.findAll)('[data-test-tag]');
        (0, _chai.expect)(tags[0].querySelector('[data-test-name]').textContent.trim()).to.equal('A - First');
        (0, _chai.expect)(tags[1].querySelector('[data-test-name]').textContent.trim()).to.equal('#A - Second');
        (0, _chai.expect)(tags[2].querySelector('[data-test-name]').textContent.trim()).to.equal('B - Third');
        (0, _chai.expect)(tags[3].querySelector('[data-test-name]').textContent.trim()).to.equal('Z - Last');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/unsplash-test", ["ghost-admin/utils/ctrl-or-cmd", "ember-cli-mirage/test-support/setup-mirage", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ghost-admin/tests/helpers/visit"], function (_ctrlOrCmd, _setupMirage, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _visit) {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  (0, _mocha.describe)('Acceptance: Settings - Integrations - Unsplash', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/settings/integrations/unsplash');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/unsplash');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/unsplash');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as editor', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/unsplash');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff');
    });
    (0, _mocha.describe)('when logged in', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('it can activate/deactivate', async function () {
        await (0, _visit.visit)('/settings/integrations/unsplash'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/unsplash'); // verify we don't have an unsplash setting fixture loaded

        (0, _chai.expect)(this.server.db.settings.where({
          key: 'unsplash'
        }), 'initial server settings').to.be.empty; // it's enabled by default when settings is empty

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-checkbox="unsplash"]').checked, 'checked by default').to.be.true; // trigger a save

        await (0, _testHelpers.click)('[data-test-save-button]'); // server should now have an unsplash setting

        let _this$server$db$setti = this.server.db.settings.where({
          key: 'unsplash'
        }),
            _this$server$db$setti2 = _slicedToArray(_this$server$db$setti, 1),
            setting = _this$server$db$setti2[0];

        (0, _chai.expect)(setting, 'unsplash setting after save').to.exist;
        (0, _chai.expect)(setting.value).to.equal('{"isActive":true}'); // disable

        await (0, _testHelpers.click)('[data-test-checkbox="unsplash"]'); // save via CMD-S shortcut

        await (0, _testHelpers.triggerEvent)('.gh-app', 'keydown', {
          keyCode: 83,
          // s
          metaKey: _ctrlOrCmd.default === 'command',
          ctrlKey: _ctrlOrCmd.default === 'ctrl'
        }); // server should have an updated setting

        var _this$server$db$setti3 = this.server.db.settings.where({
          key: 'unsplash'
        });

        var _this$server$db$setti4 = _slicedToArray(_this$server$db$setti3, 1);

        setting = _this$server$db$setti4[0];
        (0, _chai.expect)(setting.value).to.equal('{"isActive":false}');
      });
      (0, _mocha.it)('warns when leaving without saving', async function () {
        await (0, _visit.visit)('/settings/integrations/unsplash'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/unsplash');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-checkbox="unsplash"]').checked, 'checked by default').to.be.true;
        await (0, _testHelpers.click)('[data-test-checkbox="unsplash"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-checkbox="unsplash"]').checked, 'Unsplash checkbox').to.be.false;
        await (0, _visit.visit)('/settings/labs');
        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal').length, 'modal exists').to.equal(1); // Leave without saving

        await (0, _testHelpers.click)('.fullscreen-modal [data-test-leave-button]');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/labs');
        await (0, _visit.visit)('/settings/integrations/unsplash');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/unsplash'); // settings were not saved

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-checkbox="unsplash"]').checked, 'Unsplash checkbox').to.be.true;
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/zapier-test", ["ember-cli-mirage/test-support/setup-mirage", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ghost-admin/tests/helpers/visit"], function (_setupMirage, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Settings - Integrations - Zapier', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/settings/integrations/zapier');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/zapier');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/zapier');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as editor', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/zapier');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff');
    });
    (0, _mocha.describe)('when logged in', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('it loads', async function () {
        await (0, _visit.visit)('/settings/integrations/zapier'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/zapier');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/setup-test", ["moment", "ember-cli-mirage/test-support/setup-mirage", "ember-cli-mirage", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ghost-admin/tests/helpers/visit"], function (_moment, _setupMirage, _emberCliMirage, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Setup', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.it)('redirects if already authenticated', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/setup/one');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/site');
      await (0, _visit.visit)('/setup/two');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/site');
      await (0, _visit.visit)('/setup/three');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/site');
    });
    (0, _mocha.it)('redirects to signin if already set up', async function () {
      // mimick an already setup blog
      this.server.get('/authentication/setup/', function () {
        return {
          setup: [{
            status: true
          }]
        };
      });
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/setup');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/signin');
    });
    (0, _mocha.describe)('with a new blog', function () {
      (0, _mocha.beforeEach)(function () {
        // mimick a new blog
        this.server.get('/authentication/setup/', function () {
          return {
            setup: [{
              status: false
            }]
          };
        });
      });
      (0, _mocha.it)('has a successful happy path', async function () {
        await (0, _testSupport.invalidateSession)();
        this.server.loadFixtures('roles');
        await (0, _visit.visit)('/setup'); // it redirects to step one

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after accessing /setup').to.equal('/setup/one'); // it highlights first step

        let stepIcons = (0, _testHelpers.findAll)('.gh-flow-nav .step');
        (0, _chai.expect)(stepIcons.length, 'sanity check: three steps').to.equal(3);
        (0, _chai.expect)(stepIcons[0], 'first step').to.have.class('active');
        (0, _chai.expect)(stepIcons[1], 'second step').to.not.have.class('active');
        (0, _chai.expect)(stepIcons[2], 'third step').to.not.have.class('active'); // it displays download count (count increments for each ajax call
        // and polling is disabled in testing so our count should be "1"

        (0, _chai.expect)((0, _testHelpers.find)('.gh-flow-content em').textContent.trim()).to.equal('1');
        await (0, _testHelpers.click)('.gh-btn-green'); // it transitions to step two

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after clicking "Create your account"').to.equal('/setup/two'); // email field is focused by default
        // NOTE: $('x').is(':focus') doesn't work in phantomjs CLI runner
        // https://github.com/ariya/phantomjs/issues/10427

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-blog-title-input]')[0] === document.activeElement, 'blog title has focus').to.be.true;
        await (0, _testHelpers.click)('.gh-btn-green'); // it marks fields as invalid

        (0, _chai.expect)((0, _testHelpers.findAll)('.form-group.error').length, 'number of invalid fields').to.equal(4); // it displays error messages

        (0, _chai.expect)((0, _testHelpers.findAll)('.error .response').length, 'number of in-line validation messages').to.equal(4); // it displays main error

        (0, _chai.expect)((0, _testHelpers.findAll)('.main-error').length, 'main error is displayed').to.equal(1); // enter valid details and submit

        await (0, _testHelpers.fillIn)('[data-test-email-input]', 'test@example.com');
        await (0, _testHelpers.fillIn)('[data-test-name-input]', 'Test User');
        await (0, _testHelpers.fillIn)('[data-test-password-input]', 'thisissupersafe');
        await (0, _testHelpers.fillIn)('[data-test-blog-title-input]', 'Blog Title');
        await (0, _testHelpers.click)('.gh-btn-green'); // it transitions to step 3

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after submitting step two').to.equal('/setup/three'); // submit button is "disabled"

        (0, _chai.expect)((0, _testHelpers.find)('button[type="submit"]').classList.contains('gh-btn-green'), 'invite button with no emails is white').to.be.false; // fill in a valid email

        await (0, _testHelpers.fillIn)('[name="users"]', 'new-user@example.com'); // submit button is "enabled"

        (0, _chai.expect)((0, _testHelpers.find)('button[type="submit"]').classList.contains('gh-btn-green'), 'invite button is green with valid email address').to.be.true; // submit the invite form

        await (0, _testHelpers.click)('button[type="submit"]'); // it redirects to the home / "content" screen

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after submitting invites').to.equal('/site'); // it displays success alert

        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert-green').length, 'number of success alerts').to.equal(1);
      });
      (0, _mocha.it)('handles validation errors in step 2', async function () {
        let postCount = 0;
        await (0, _testSupport.invalidateSession)();
        this.server.loadFixtures('roles');
        this.server.post('/authentication/setup', function () {
          postCount += 1; // validation error

          if (postCount === 1) {
            return new _emberCliMirage.Response(422, {}, {
              errors: [{
                type: 'ValidationError',
                message: 'Server response message'
              }]
            });
          } // server error


          if (postCount === 2) {
            return new _emberCliMirage.Response(500, {}, null);
          }
        });
        await (0, _visit.visit)('/setup/two');
        await (0, _testHelpers.click)('.gh-btn-green'); // non-server validation

        (0, _chai.expect)((0, _testHelpers.find)('.main-error').textContent.trim(), 'error text').to.not.be.empty;
        await (0, _testHelpers.fillIn)('[data-test-email-input]', 'test@example.com');
        await (0, _testHelpers.fillIn)('[data-test-name-input]', 'Test User');
        await (0, _testHelpers.fillIn)('[data-test-password-input]', 'thisissupersafe');
        await (0, _testHelpers.fillIn)('[data-test-blog-title-input]', 'Blog Title'); // first post - simulated validation error

        await (0, _testHelpers.click)('.gh-btn-green');
        (0, _chai.expect)((0, _testHelpers.find)('.main-error').textContent.trim(), 'error text').to.equal('Server response message'); // second post - simulated server error

        await (0, _testHelpers.click)('.gh-btn-green');
        (0, _chai.expect)((0, _testHelpers.find)('.main-error').textContent.trim(), 'error text').to.be.empty;
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert-red').length, 'number of alerts').to.equal(1);
      });
      (0, _mocha.it)('handles invalid origin error on step 2', async function () {
        // mimick the API response for an invalid origin
        this.server.post('/session', function () {
          return new _emberCliMirage.Response(401, {}, {
            errors: [{
              type: 'UnauthorizedError',
              message: 'Access Denied from url: unknown.com. Please use the url configured in config.js.'
            }]
          });
        });
        await (0, _testSupport.invalidateSession)();
        this.server.loadFixtures('roles');
        await (0, _visit.visit)('/setup/two');
        await (0, _testHelpers.fillIn)('[data-test-email-input]', 'test@example.com');
        await (0, _testHelpers.fillIn)('[data-test-name-input]', 'Test User');
        await (0, _testHelpers.fillIn)('[data-test-password-input]', 'thisissupersafe');
        await (0, _testHelpers.fillIn)('[data-test-blog-title-input]', 'Blog Title');
        await (0, _testHelpers.click)('.gh-btn-green'); // button should not be spinning

        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-btn-green .spinner').length, 'button has spinner').to.equal(0); // we should show an error message

        (0, _chai.expect)((0, _testHelpers.find)('.main-error').textContent, 'error text').to.have.string('Access Denied from url: unknown.com. Please use the url configured in config.js.');
      });
      (0, _mocha.it)('handles validation errors in step 3', async function () {
        let input = '[name="users"]';
        let postCount = 0;
        let button, formGroup;
        await (0, _testSupport.invalidateSession)();
        this.server.loadFixtures('roles');
        this.server.post('/invites/', function (_ref) {
          let invites = _ref.invites;
          let attrs = this.normalizedRequestAttrs();
          postCount += 1; // invalid

          if (postCount === 1) {
            return new _emberCliMirage.Response(422, {}, {
              errors: [{
                type: 'ValidationError',
                message: 'Dummy validation error'
              }]
            });
          } // TODO: duplicated from mirage/config/invites - extract method?


          attrs.token = "".concat(invites.all().models.length, "-token");
          attrs.expires = _moment.default.utc().add(1, 'day').valueOf();
          attrs.createdAt = _moment.default.utc().format();
          attrs.createdBy = 1;
          attrs.updatedAt = _moment.default.utc().format();
          attrs.updatedBy = 1;
          attrs.status = 'sent';
          return invites.create(attrs);
        }); // complete step 2 so we can access step 3

        await (0, _visit.visit)('/setup/two');
        await (0, _testHelpers.fillIn)('[data-test-email-input]', 'test@example.com');
        await (0, _testHelpers.fillIn)('[data-test-name-input]', 'Test User');
        await (0, _testHelpers.fillIn)('[data-test-password-input]', 'thisissupersafe');
        await (0, _testHelpers.fillIn)('[data-test-blog-title-input]', 'Blog Title');
        await (0, _testHelpers.click)('.gh-btn-green'); // default field/button state

        formGroup = (0, _testHelpers.find)('.gh-flow-invite .form-group');
        button = (0, _testHelpers.find)('.gh-flow-invite button[type="submit"]');
        (0, _chai.expect)(formGroup, 'default field has error class').to.not.have.class('error');
        (0, _chai.expect)(button.textContent, 'default button text').to.have.string('Invite some users');
        (0, _chai.expect)(button, 'default button is disabled').to.have.class('gh-btn-minor'); // no users submitted state

        await (0, _testHelpers.click)('.gh-flow-invite button[type="submit"]');
        (0, _chai.expect)(formGroup, 'no users submitted field has error class').to.have.class('error');
        (0, _chai.expect)(button.textContent, 'no users submitted button text').to.have.string('No users to invite');
        (0, _chai.expect)(button, 'no users submitted button is disabled').to.have.class('gh-btn-minor'); // single invalid email

        await (0, _testHelpers.fillIn)(input, 'invalid email');
        await (0, _testHelpers.blur)(input);
        (0, _chai.expect)(formGroup, 'invalid field has error class').to.have.class('error');
        (0, _chai.expect)(button.textContent, 'single invalid button text').to.have.string('1 invalid email address');
        (0, _chai.expect)(button, 'invalid email button is disabled').to.have.class('gh-btn-minor'); // multiple invalid emails

        await (0, _testHelpers.fillIn)(input, 'invalid email\nanother invalid address');
        await (0, _testHelpers.blur)(input);
        (0, _chai.expect)(button.textContent, 'multiple invalid button text').to.have.string('2 invalid email addresses'); // single valid email

        await (0, _testHelpers.fillIn)(input, 'invited@example.com');
        await (0, _testHelpers.blur)(input);
        (0, _chai.expect)(formGroup, 'valid field has error class').to.not.have.class('error');
        (0, _chai.expect)(button.textContent, 'single valid button text').to.have.string('Invite 1 user');
        (0, _chai.expect)(button, 'valid email button is enabled').to.have.class('gh-btn-green'); // multiple valid emails

        await (0, _testHelpers.fillIn)(input, 'invited1@example.com\ninvited2@example.com');
        await (0, _testHelpers.blur)(input);
        (0, _chai.expect)(button.textContent, 'multiple valid button text').to.have.string('Invite 2 users'); // submit invitations with simulated failure on 1 invite

        await (0, _testHelpers.click)('.gh-btn-green'); // it redirects to the home / "content" screen

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after submitting invites').to.equal('/site'); // it displays success alert

        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert-green').length, 'number of success alerts').to.equal(1); // it displays failure alert

        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert-red').length, 'number of failure alerts').to.equal(1);
      });
    });
  });
});
define("ghost-admin/tests/acceptance/signin-test", ["ember-cli-mirage/test-support/setup-mirage", "ember-cli-mirage", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ghost-admin/tests/helpers/visit"], function (_setupMirage, _emberCliMirage, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Signin', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.it)('redirects if already authenticated', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/signin');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'current url').to.equal('/site');
    });
    (0, _mocha.describe)('when attempting to signin', function () {
      (0, _mocha.beforeEach)(function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role],
          slug: 'test-user'
        });
        this.server.post('/session', function (schema, _ref) {
          let requestBody = _ref.requestBody;

          let _JSON$parse = JSON.parse(requestBody),
              username = _JSON$parse.username,
              password = _JSON$parse.password;

          (0, _chai.expect)(username).to.equal('test@example.com');

          if (password === 'thisissupersafe') {
            return new _emberCliMirage.Response(201);
          } else {
            return new _emberCliMirage.Response(401, {}, {
              errors: [{
                type: 'UnauthorizedError',
                message: 'Invalid Password'
              }]
            });
          }
        });
      });
      (0, _mocha.it)('errors correctly', async function () {
        await (0, _testSupport.invalidateSession)();
        await (0, _visit.visit)('/signin');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'signin url').to.equal('/signin');
        (0, _chai.expect)((0, _testHelpers.findAll)('input[name="identification"]').length, 'email input field').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.findAll)('input[name="password"]').length, 'password input field').to.equal(1);
        await (0, _testHelpers.click)('.gh-btn-blue');
        (0, _chai.expect)((0, _testHelpers.findAll)('.form-group.error').length, 'number of invalid fields').to.equal(2);
        (0, _chai.expect)((0, _testHelpers.findAll)('.main-error').length, 'main error is displayed').to.equal(1);
        await (0, _testHelpers.fillIn)('[name="identification"]', 'test@example.com');
        await (0, _testHelpers.fillIn)('[name="password"]', 'invalid');
        await (0, _testHelpers.click)('.gh-btn-blue');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'current url').to.equal('/signin');
        (0, _chai.expect)((0, _testHelpers.findAll)('.main-error').length, 'main error is displayed').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('.main-error').textContent.trim(), 'main error text').to.equal('Invalid Password');
      });
      (0, _mocha.it)('submits successfully', async function () {
        (0, _testSupport.invalidateSession)();
        await (0, _visit.visit)('/signin');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'current url').to.equal('/signin');
        await (0, _testHelpers.fillIn)('[name="identification"]', 'test@example.com');
        await (0, _testHelpers.fillIn)('[name="password"]', 'thisissupersafe');
        await (0, _testHelpers.click)('.gh-btn-blue');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/signup-test", ["ember-cli-mirage/test-support/setup-mirage", "ember-simple-auth/test-support", "@ember/test-helpers", "mocha", "chai", "ember-mocha", "ghost-admin/tests/helpers/visit"], function (_setupMirage, _testSupport, _testHelpers, _mocha, _chai, _emberMocha, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Signup', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.it)('can signup successfully', async function () {
      let server = this.server;
      server.get('/authentication/invitation', function () {
        return {
          invitation: [{
            valid: true
          }]
        };
      });
      server.post('/authentication/invitation/', function (_ref, _ref2) {
        let users = _ref.users;
        let requestBody = _ref2.requestBody;
        let params = JSON.parse(requestBody);
        (0, _chai.expect)(params.invitation[0].name).to.equal('Test User');
        (0, _chai.expect)(params.invitation[0].email).to.equal('kevin+test2@ghost.org');
        (0, _chai.expect)(params.invitation[0].password).to.equal('thisissupersafe');
        (0, _chai.expect)(params.invitation[0].token).to.equal('MTQ3MDM0NjAxNzkyOXxrZXZpbit0ZXN0MkBnaG9zdC5vcmd8MmNEblFjM2c3ZlFUajluTks0aUdQU0dmdm9ta0xkWGY2OEZ1V2dTNjZVZz0'); // ensure that `/users/me/` request returns a user

        let role = server.create('role', {
          name: 'Author'
        });
        users.create({
          email: 'kevin@test2@ghost.org',
          roles: [role]
        });
        return {
          invitation: [{
            message: 'Invitation accepted.'
          }]
        };
      }); // token details:
      // "1470346017929|kevin+test2@ghost.org|2cDnQc3g7fQTj9nNK4iGPSGfvomkLdXf68FuWgS66Ug="

      await (0, _visit.visit)('/signup/MTQ3MDM0NjAxNzkyOXxrZXZpbit0ZXN0MkBnaG9zdC5vcmd8MmNEblFjM2c3ZlFUajluTks0aUdQU0dmdm9ta0xkWGY2OEZ1V2dTNjZVZz0');
      (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('signup'); // focus out in Name field triggers inline error

      await (0, _testHelpers.blur)('[data-test-input="name"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="name"]').closest('.form-group'), 'name field group has error class when empty').to.have.class('error');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="name"]').closest('.form-group').querySelector('.response').textContent, 'name inline-error text').to.have.string('Please enter a name'); // entering text in Name field clears error

      await (0, _testHelpers.fillIn)('[data-test-input="name"]', 'Test User');
      await (0, _testHelpers.blur)('[data-test-input="name"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="name"]').closest('.form-group'), 'name field loses error class after text input').to.not.have.class('error');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="name"]').closest('.form-group').querySelector('.response').textContent.trim(), 'name field error is removed after text input').to.be.empty; // focus out in Email field triggers inline error

      await (0, _testHelpers.click)('[data-test-input="email"]');
      await (0, _testHelpers.blur)('[data-test-input="email"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="email"]').closest('.form-group'), 'email field group has error class when empty').to.have.class('error');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="email"]').closest('.form-group').querySelector('.response').textContent, 'email inline-error text').to.have.string('Please enter an email'); // entering text in email field clears error

      await (0, _testHelpers.fillIn)('[data-test-input="email"]', 'kevin+test2@ghost.org');
      await (0, _testHelpers.blur)('[data-test-input="email"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="email"]').closest('.form-group'), 'email field loses error class after text input').to.not.have.class('error');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="email"]').closest('.form-group').querySelector('.response').textContent.trim(), 'email field error is removed after text input').to.be.empty; // check password validation
      // focus out in password field triggers inline error
      // no password

      await (0, _testHelpers.click)('[data-test-input="password"]');
      await (0, _testHelpers.blur)();
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="password"]').closest('.form-group'), 'password field group has error class when empty').to.have.class('error');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="password"]').closest('.form-group').querySelector('.response').textContent, 'password field error text').to.have.string('must be at least 10 characters'); // password too short

      await (0, _testHelpers.fillIn)('[data-test-input="password"]', 'short');
      await (0, _testHelpers.blur)('[data-test-input="password"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="password"]').closest('.form-group').querySelector('.response').textContent, 'password field error text').to.have.string('must be at least 10 characters'); // password must not be a bad password

      await (0, _testHelpers.fillIn)('[data-test-input="password"]', '1234567890');
      await (0, _testHelpers.blur)('[data-test-input="password"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="password"]').closest('.form-group').querySelector('.response').textContent, 'password field error text').to.have.string('you cannot use an insecure password'); // password must not be a disallowed password

      await (0, _testHelpers.fillIn)('[data-test-input="password"]', 'password99');
      await (0, _testHelpers.blur)('[data-test-input="password"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="password"]').closest('.form-group').querySelector('.response').textContent, 'password field error text').to.have.string('you cannot use an insecure password'); // password must not have repeating characters

      await (0, _testHelpers.fillIn)('[data-test-input="password"]', '2222222222');
      await (0, _testHelpers.blur)('[data-test-input="password"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="password"]').closest('.form-group').querySelector('.response').textContent, 'password field error text').to.have.string('you cannot use an insecure password'); // entering valid text in Password field clears error

      await (0, _testHelpers.fillIn)('[data-test-input="password"]', 'thisissupersafe');
      await (0, _testHelpers.blur)('[data-test-input="password"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="password"]').closest('.form-group'), 'password field loses error class after text input').to.not.have.class('error');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="password"]').closest('.form-group').querySelector('.response').textContent.trim(), 'password field error is removed after text input').to.equal(''); // submitting sends correct details and redirects to content screen

      await (0, _testHelpers.click)('.gh-btn-green');
      (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('site');
    });
    (0, _mocha.it)('redirects if already logged in', async function () {
      this.server.get('/authentication/invitation', function () {
        return {
          invitation: [{
            valid: true
          }]
        };
      });
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)(); // token details:
      // "1470346017929|kevin+test2@ghost.org|2cDnQc3g7fQTj9nNK4iGPSGfvomkLdXf68FuWgS66Ug="

      await (0, _visit.visit)('/signup/MTQ3MDM0NjAxNzkyOXxrZXZpbit0ZXN0MkBnaG9zdC5vcmd8MmNEblFjM2c3ZlFUajluTks0aUdQU0dmdm9ta0xkWGY2OEZ1V2dTNjZVZz0');
      (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('site');
      (0, _chai.expect)((0, _testHelpers.find)('.gh-alert-content').textContent).to.have.string('sign out to register');
    });
    (0, _mocha.it)('redirects with alert on invalid token', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/signup/---invalid---');
      (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('signin');
      (0, _chai.expect)((0, _testHelpers.find)('.gh-alert-content').textContent).to.have.string('Invalid token');
    });
    (0, _mocha.it)('redirects with alert on non-existant or expired token', async function () {
      this.server.get('/authentication/invitation', function () {
        return {
          invitation: [{
            valid: false
          }]
        };
      });
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/signup/expired');
      (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('signin');
      (0, _chai.expect)((0, _testHelpers.find)('.gh-alert-content').textContent).to.have.string('not exist');
    });
  });
});
define("ghost-admin/tests/acceptance/staff-test", ["ghost-admin/utils/ctrl-or-cmd", "moment", "ember-cli-mirage/test-support/setup-mirage", "ghost-admin/utils/window-proxy", "ember-cli-mirage", "mocha", "ember-simple-auth/test-support", "@ember/test-helpers", "ghost-admin/tests/helpers/adapter-error", "chai", "ember-mocha", "ghost-admin/tests/helpers/visit"], function (_ctrlOrCmd, _moment, _setupMirage, _windowProxy, _emberCliMirage, _mocha, _testSupport, _testHelpers, _adapterError, _chai, _emberMocha, _visit) {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  (0, _mocha.describe)('Acceptance: Staff', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/staff');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/signin');
    });
    (0, _mocha.it)('redirects correctly when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      this.server.create('user', {
        slug: 'no-access'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/staff/no-access');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.it)('redirects correctly when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      this.server.create('user', {
        slug: 'no-access'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/staff/no-access');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-user');
    });
    (0, _mocha.it)('redirects correctly when authenticated as editor', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      this.server.create('user', {
        slug: 'no-access'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/staff/no-access');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff');
    });
    (0, _mocha.describe)('when logged in as admin', function () {
      let admin, adminRole, suspendedUser;
      (0, _mocha.beforeEach)(async function () {
        this.server.loadFixtures('roles');
        adminRole = this.server.schema.roles.find(1);
        admin = this.server.create('user', {
          email: 'admin@example.com',
          roles: [adminRole]
        }); // add an expired invite

        this.server.create('invite', {
          expires: _moment.default.utc().subtract(1, 'day').valueOf(),
          role: adminRole
        }); // add a suspended user

        suspendedUser = this.server.create('user', {
          email: 'suspended@example.com',
          roles: [adminRole],
          status: 'inactive'
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('it renders and navigates correctly', async function () {
        let user1 = this.server.create('user');
        let user2 = this.server.create('user');
        await (0, _visit.visit)('/staff'); // doesn't do any redirecting

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff'); // it has correct page title

        (0, _chai.expect)(document.title, 'page title').to.equal('Staff - Test Blog'); // it shows active users in active section

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-active-users] [data-test-user-id]').length, 'number of active users').to.equal(3);
        (0, _chai.expect)((0, _testHelpers.find)("[data-test-active-users] [data-test-user-id=\"".concat(user1.id, "\"]"))).to.exist;
        (0, _chai.expect)((0, _testHelpers.find)("[data-test-active-users] [data-test-user-id=\"".concat(user2.id, "\"]"))).to.exist;
        (0, _chai.expect)((0, _testHelpers.find)("[data-test-active-users] [data-test-user-id=\"".concat(admin.id, "\"]"))).to.exist; // it shows suspended users in suspended section

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-suspended-users] [data-test-user-id]').length, 'number of suspended users').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)("[data-test-suspended-users] [data-test-user-id=\"".concat(suspendedUser.id, "\"]"))).to.exist;
        await (0, _testHelpers.click)("[data-test-user-id=\"".concat(user2.id, "\"]")); // url is correct

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after clicking user').to.equal("/staff/".concat(user2.slug)); // title is correct

        (0, _chai.expect)(document.title, 'title after clicking user').to.equal('Staff - User - Test Blog'); // view title should exist and be linkable and active

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-screen-title] a[href="/ghost/staff"]').classList.contains('active'), 'has linkable url back to staff main page').to.be.true;
        await (0, _testHelpers.click)('[data-test-screen-title] a'); // url should be /staff again

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after clicking back').to.equal('/staff');
      });
      (0, _mocha.it)('can manage invites', async function () {
        await (0, _visit.visit)('/staff'); // invite user button exists

        (0, _chai.expect)((0, _testHelpers.find)('.view-actions .gh-btn-green'), 'invite people button').to.exist; // existing users are listed

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-user-id]').length, 'initial number of active users').to.equal(2);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-user-id="1"] [data-test-role-name]').textContent.trim(), 'active user\'s role label').to.equal('Administrator'); // existing invites are shown

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-invite-id]').length, 'initial number of invited users').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-invite-id="1"] [data-test-invite-description]').textContent, 'expired invite description').to.match(/expired/); // remove expired invite

        await (0, _testHelpers.click)('[data-test-invite-id="1"] [data-test-revoke-button]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-invite-id]').length, 'initial number of invited users').to.equal(0); // click the invite people button

        await (0, _testHelpers.click)('.view-actions .gh-btn-green');
        let roleOptions = (0, _testHelpers.findAll)('.fullscreen-modal select[name="role"] option');

        function checkOwnerExists() {
          for (let i in roleOptions) {
            if (roleOptions[i].tagName === 'option' && roleOptions[i].text === 'Owner') {
              return true;
            }
          }

          return false;
        }

        function checkSelectedIsAuthor() {
          for (let i in roleOptions) {
            if (roleOptions[i].selected) {
              return roleOptions[i].text === 'Author';
            }
          }

          return false;
        } // modal is displayed


        (0, _chai.expect)((0, _testHelpers.find)('.fullscreen-modal h1').textContent.trim(), 'correct modal is displayed').to.equal('Invite a New User'); // number of roles is correct

        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal select[name="role"] option').length, 'number of selectable roles').to.equal(3);
        (0, _chai.expect)(checkOwnerExists(), 'owner role isn\'t available').to.be.false;
        (0, _chai.expect)(checkSelectedIsAuthor(), 'author role is selected initially').to.be.true; // submit valid invite form

        await (0, _testHelpers.fillIn)('.fullscreen-modal input[name="email"]', 'invite1@example.com');
        await (0, _testHelpers.click)('.fullscreen-modal .gh-btn-green'); // modal closes

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-modal]').length, 'number of modals after sending invite').to.equal(0); // invite is displayed, has correct e-mail + role

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-invite-id]').length, 'number of invites after first invite').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-invite-id="2"] [data-test-email]').textContent.trim(), 'displayed email of first invite').to.equal('invite1@example.com');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-invite-id="2"] [data-test-role-name]').textContent.trim(), 'displayed role of first invite').to.equal('Author');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-invite-id="2"] [data-test-invite-description]').textContent, 'new invite description').to.match(/expires/); // number of users is unchanged

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-user-id]').length, 'number of active users after first invite').to.equal(2); // submit new invite with different role

        await (0, _testHelpers.click)('.view-actions .gh-btn-green');
        await (0, _testHelpers.fillIn)('.fullscreen-modal input[name="email"]', 'invite2@example.com');
        await (0, _testHelpers.fillIn)('.fullscreen-modal select[name="role"]', '2');
        await (0, _testHelpers.click)('.fullscreen-modal .gh-btn-green'); // number of invites increases

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-invite-id]').length, 'number of invites after second invite').to.equal(2); // invite has correct e-mail + role

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-invite-id="3"] [data-test-email]').textContent.trim(), 'displayed email of second invite').to.equal('invite2@example.com');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-invite-id="3"] [data-test-role-name]').textContent.trim(), 'displayed role of second invite').to.equal('Editor'); // submit invite form with existing user

        await (0, _testHelpers.click)('.view-actions .gh-btn-green');
        await (0, _testHelpers.fillIn)('.fullscreen-modal input[name="email"]', 'admin@example.com');
        await (0, _testHelpers.click)('.fullscreen-modal .gh-btn-green'); // validation message is displayed

        (0, _chai.expect)((0, _testHelpers.find)('.fullscreen-modal .error .response').textContent.trim(), 'inviting existing user error').to.equal('A user with that email address already exists.'); // submit invite form with existing invite

        await (0, _testHelpers.fillIn)('.fullscreen-modal input[name="email"]', 'invite1@example.com');
        await (0, _testHelpers.click)('.fullscreen-modal .gh-btn-green'); // validation message is displayed

        (0, _chai.expect)((0, _testHelpers.find)('.fullscreen-modal .error .response').textContent.trim(), 'inviting invited user error').to.equal('A user with that email address was already invited.'); // submit invite form with an invalid email

        await (0, _testHelpers.fillIn)('.fullscreen-modal input[name="email"]', 'test');
        await (0, _testHelpers.click)('.fullscreen-modal .gh-btn-green'); // validation message is displayed

        (0, _chai.expect)((0, _testHelpers.find)('.fullscreen-modal .error .response').textContent.trim(), 'inviting invalid email error').to.equal('Invalid Email.');
        await (0, _testHelpers.click)('.fullscreen-modal a.close'); // revoke latest invite

        await (0, _testHelpers.click)('[data-test-invite-id="3"] [data-test-revoke-button]'); // number of invites decreases

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-invite-id]').length, 'number of invites after revoke').to.equal(1); // notification is displayed

        (0, _chai.expect)((0, _testHelpers.find)('.gh-notification').textContent.trim(), 'notifications contain revoke').to.match(/Invitation revoked\. \(invite2@example\.com\)/); // correct invite is removed

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-invite-id] [data-test-email]').textContent.trim(), 'displayed email of remaining invite').to.equal('invite1@example.com'); // add another invite to test ordering on resend

        await (0, _testHelpers.click)('.view-actions .gh-btn-green');
        await (0, _testHelpers.fillIn)('.fullscreen-modal input[name="email"]', 'invite3@example.com');
        await (0, _testHelpers.click)('.fullscreen-modal .gh-btn-green'); // new invite should be last in the list

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-invite-id]:last-of-type [data-test-email]').textContent.trim(), 'last invite email in list').to.equal('invite3@example.com'); // resend first invite

        await (0, _testHelpers.click)('[data-test-invite-id="2"] [data-test-resend-button]'); // notification is displayed

        (0, _chai.expect)((0, _testHelpers.find)('.gh-notification').textContent.trim(), 'notifications contain resend').to.match(/Invitation resent! \(invite1@example\.com\)/); // first invite is still at the top

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-invite-id]:first-of-type [data-test-email]').textContent.trim(), 'first invite email in list').to.equal('invite1@example.com'); // regression test: can revoke a resent invite

        await (0, _testHelpers.click)('[data-test-invite-id]:first-of-type [data-test-resend-button]');
        await (0, _testHelpers.click)('[data-test-invite-id]:first-of-type [data-test-revoke-button]'); // number of invites decreases

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-invite-id]').length, 'number of invites after resend/revoke').to.equal(1); // notification is displayed

        (0, _chai.expect)((0, _testHelpers.find)('.gh-notification').textContent.trim(), 'notifications contain revoke after resend/revoke').to.match(/Invitation revoked\. \(invite1@example\.com\)/);
      });
      (0, _mocha.it)('can manage suspended users', async function () {
        await (0, _visit.visit)('/staff');
        await (0, _testHelpers.click)("[data-test-user-id=\"".concat(suspendedUser.id, "\"]"));
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-suspended-badge]')).to.exist;
        await (0, _testHelpers.click)('[data-test-user-actions]');
        await (0, _testHelpers.click)('[data-test-unsuspend-button]');
        await (0, _testHelpers.click)('[data-test-modal-confirm]'); // NOTE: there seems to be a timing issue with this test - pausing
        // here confirms that the badge is removed but the andThen is firing
        // before the page is updated
        // andThen(() => {
        //     expect('[data-test-suspended-badge]').to.not.exist;
        // });

        await (0, _testHelpers.click)('[data-test-staff-link]'); // suspendedUser is now in active list

        (0, _chai.expect)((0, _testHelpers.find)("[data-test-active-users] [data-test-user-id=\"".concat(suspendedUser.id, "\"]"))).to.exist; // no suspended users

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-suspended-users] [data-test-user-id]').length).to.equal(0);
        await (0, _testHelpers.click)("[data-test-user-id=\"".concat(suspendedUser.id, "\"]"));
        await (0, _testHelpers.click)('[data-test-user-actions]');
        await (0, _testHelpers.click)('[data-test-suspend-button]');
        await (0, _testHelpers.click)('[data-test-modal-confirm]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-suspended-badge]')).to.exist;
      });
      (0, _mocha.it)('can delete users', async function () {
        let user1 = this.server.create('user');
        let user2 = this.server.create('user');
        let post = this.server.create('post', {
          authors: [user2]
        }); // we don't have a full many-to-many relationship in mirage so we
        // need to add the inverse manually

        user2.posts = [post];
        user2.save();
        await (0, _visit.visit)('/staff');
        await (0, _testHelpers.click)("[data-test-user-id=\"".concat(user1.id, "\"]")); // user deletion displays modal

        await (0, _testHelpers.click)('button.delete');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-modal="delete-user"]').length, 'user deletion modal displayed after button click').to.equal(1); // user has no posts so no warning about post deletion

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-text="user-post-count"]').length, 'deleting user with no posts has no post count').to.equal(0); // cancelling user deletion closes modal

        await (0, _testHelpers.click)('[data-test-button="cancel-delete-user"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-modal]').length === 0, 'delete user modal is closed when cancelling').to.be.true; // deleting a user with posts

        await (0, _visit.visit)('/staff');
        await (0, _testHelpers.click)("[data-test-user-id=\"".concat(user2.id, "\"]"));
        await (0, _testHelpers.click)('button.delete'); // user has  posts so should warn about post deletion

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="user-post-count"]').textContent, 'deleting user with posts has post count').to.have.string('1 post');
        await (0, _testHelpers.click)('[data-test-button="confirm-delete-user"]'); // redirected to staff page

        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/staff'); // deleted user is not in list

        (0, _chai.expect)((0, _testHelpers.findAll)("[data-test-user-id=\"".concat(user2.id, "\"]")).length, 'deleted user is not in user list after deletion').to.equal(0);
      });
      (0, _mocha.describe)('existing user', function () {
        let user, newLocation, originalReplaceState;
        (0, _mocha.beforeEach)(function () {
          user = this.server.create('user', {
            slug: 'test-1',
            name: 'Test User',
            facebook: 'test',
            twitter: '@test'
          });
          originalReplaceState = _windowProxy.default.replaceState;

          _windowProxy.default.replaceState = function (params, title, url) {
            newLocation = url;
          };

          newLocation = undefined;
        });
        (0, _mocha.afterEach)(function () {
          _windowProxy.default.replaceState = originalReplaceState;
        });
        (0, _mocha.it)('input fields reset and validate correctly', async function () {
          // test user name
          await (0, _visit.visit)('/staff/test-1');
          (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-1');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-name-input]').value, 'current user name').to.equal('Test User');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Save'); // test empty user name

          await (0, _testHelpers.fillIn)('[data-test-name-input]', '');
          await (0, _testHelpers.blur)('[data-test-name-input]');
          (0, _chai.expect)((0, _testHelpers.find)('.user-details-bottom .first-form-group').classList.contains('error'), 'username input is in error state with blank input').to.be.true; // test too long user name

          await (0, _testHelpers.fillIn)('[data-test-name-input]', new Array(195).join('a'));
          await (0, _testHelpers.blur)('[data-test-name-input]');
          (0, _chai.expect)((0, _testHelpers.find)('.user-details-bottom .first-form-group').classList.contains('error'), 'username input is in error state with too long input').to.be.true; // reset name field

          await (0, _testHelpers.fillIn)('[data-test-name-input]', 'Test User');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-slug-input]').value, 'slug value is default').to.equal('test-1');
          await (0, _testHelpers.fillIn)('[data-test-slug-input]', '');
          await (0, _testHelpers.blur)('[data-test-slug-input]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-slug-input]').value, 'slug value is reset to original upon empty string').to.equal('test-1'); // Save changes

          await (0, _testHelpers.click)('[data-test-save-button]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Saved'); // CMD-S shortcut works

          await (0, _testHelpers.fillIn)('[data-test-slug-input]', 'Test User');
          await (0, _testHelpers.triggerEvent)('.gh-app', 'keydown', {
            keyCode: 83,
            // s
            metaKey: _ctrlOrCmd.default === 'command',
            ctrlKey: _ctrlOrCmd.default === 'ctrl'
          }); // we've already saved in this test so there's no on-screen indication
          // that we've had another save, check the request was fired instead

          let _this$server$pretende = this.server.pretender.handledRequests.slice(-1),
              _this$server$pretende2 = _slicedToArray(_this$server$pretende, 1),
              lastRequest = _this$server$pretende2[0];

          let params = JSON.parse(lastRequest.requestBody);
          (0, _chai.expect)(params.users[0].name).to.equal('Test User'); // check that the history state has been updated

          (0, _chai.expect)(newLocation).to.equal('Test User');
          await (0, _testHelpers.fillIn)('[data-test-slug-input]', 'white space');
          await (0, _testHelpers.blur)('[data-test-slug-input]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-slug-input]').value, 'slug value is correctly dasherized').to.equal('white-space');
          await (0, _testHelpers.fillIn)('[data-test-email-input]', 'thisisnotanemail');
          await (0, _testHelpers.blur)('[data-test-email-input]');
          (0, _chai.expect)((0, _testHelpers.find)('.user-details-bottom .form-group:nth-of-type(3)').classList.contains('error'), 'email input should be in error state with invalid email').to.be.true;
          await (0, _testHelpers.fillIn)('[data-test-email-input]', 'test@example.com');
          await (0, _testHelpers.fillIn)('[data-test-location-input]', new Array(160).join('a'));
          await (0, _testHelpers.blur)('[data-test-location-input]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-location-input]').closest('.form-group'), 'location input should be in error state').to.have.class('error');
          await (0, _testHelpers.fillIn)('[data-test-location-input]', '');
          await (0, _testHelpers.fillIn)('[data-test-website-input]', 'thisisntawebsite');
          await (0, _testHelpers.blur)('[data-test-website-input]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-website-input]').closest('.form-group'), 'website input should be in error state').to.have.class('error');

          let testSocialInput = async function testSocialInput(type, input, expectedValue) {
            let expectedError = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';
            await (0, _testHelpers.fillIn)("[data-test-".concat(type, "-input]"), input);
            await (0, _testHelpers.blur)("[data-test-".concat(type, "-input]"));
            (0, _chai.expect)((0, _testHelpers.find)("[data-test-".concat(type, "-input]")).value, "".concat(type, " value for ").concat(input)).to.equal(expectedValue);
            (0, _chai.expect)((0, _testHelpers.find)("[data-test-error=\"user-".concat(type, "\"]")).textContent.trim(), "".concat(type, " validation response for ").concat(input)).to.equal(expectedError);
            (0, _chai.expect)((0, _testHelpers.find)("[data-test-error=\"user-".concat(type, "\"]")).closest('.form-group').classList.contains('error'), "".concat(type, " input should be in error state with '").concat(input, "'")).to.equal(!!expectedError);
          };

          let testFacebookValidation = async function testFacebookValidation() {
            for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
            }

            return testSocialInput('facebook', ...args);
          };

          let testTwitterValidation = async function testTwitterValidation() {
            for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
              args[_key2] = arguments[_key2];
            }

            return testSocialInput('twitter', ...args);
          }; // Testing Facebook input
          // displays initial value


          (0, _chai.expect)((0, _testHelpers.find)('[data-test-facebook-input]').value, 'initial facebook value').to.equal('https://www.facebook.com/test');
          await (0, _testHelpers.focus)('[data-test-facebook-input]');
          await (0, _testHelpers.blur)('[data-test-facebook-input]'); // regression test: we still have a value after the input is
          // focused and then blurred without any changes

          (0, _chai.expect)((0, _testHelpers.find)('[data-test-facebook-input]').value, 'facebook value after blur with no change').to.equal('https://www.facebook.com/test');
          await testFacebookValidation('facebook.com/username', 'https://www.facebook.com/username');
          await testFacebookValidation('testuser', 'https://www.facebook.com/testuser');
          await testFacebookValidation('ab99', 'https://www.facebook.com/ab99');
          await testFacebookValidation('page/ab99', 'https://www.facebook.com/page/ab99');
          await testFacebookValidation('page/*(&*(%%))', 'https://www.facebook.com/page/*(&*(%%))');
          await testFacebookValidation('facebook.com/pages/some-facebook-page/857469375913?ref=ts', 'https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts');
          await testFacebookValidation('https://www.facebook.com/groups/savethecrowninn', 'https://www.facebook.com/groups/savethecrowninn');
          await testFacebookValidation('http://github.com/username', 'http://github.com/username', 'The URL must be in a format like https://www.facebook.com/yourPage');
          await testFacebookValidation('http://github.com/pages/username', 'http://github.com/pages/username', 'The URL must be in a format like https://www.facebook.com/yourPage'); // Testing Twitter input
          // loads fixtures and performs transform

          (0, _chai.expect)((0, _testHelpers.find)('[data-test-twitter-input]').value, 'initial twitter value').to.equal('https://twitter.com/test');
          await (0, _testHelpers.focus)('[data-test-twitter-input]');
          await (0, _testHelpers.blur)('[data-test-twitter-input]'); // regression test: we still have a value after the input is
          // focused and then blurred without any changes

          (0, _chai.expect)((0, _testHelpers.find)('[data-test-twitter-input]').value, 'twitter value after blur with no change').to.equal('https://twitter.com/test');
          await testTwitterValidation('twitter.com/username', 'https://twitter.com/username');
          await testTwitterValidation('testuser', 'https://twitter.com/testuser');
          await testTwitterValidation('http://github.com/username', 'https://twitter.com/username');
          await testTwitterValidation('*(&*(%%))', '*(&*(%%))', 'The URL must be in a format like https://twitter.com/yourUsername');
          await testTwitterValidation('thisusernamehasmorethan15characters', 'thisusernamehasmorethan15characters', 'Your Username is not a valid Twitter Username'); // Testing bio input

          await (0, _testHelpers.fillIn)('[data-test-website-input]', '');
          await (0, _testHelpers.fillIn)('[data-test-bio-input]', new Array(210).join('a'));
          await (0, _testHelpers.blur)('[data-test-bio-input]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-bio-input]').closest('.form-group'), 'bio input should be in error state').to.have.class('error'); // password reset ------
          // button triggers validation

          await (0, _testHelpers.click)('[data-test-save-pw-button]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-new-pass-input]').closest('.form-group'), 'new password has error class when blank').to.have.class('error');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="user-new-pass"]').textContent, 'new password error when blank').to.have.string('can\'t be blank'); // validates too short password (< 10 characters)

          await (0, _testHelpers.fillIn)('[data-test-new-pass-input]', 'notlong');
          await (0, _testHelpers.fillIn)('[data-test-ne2-pass-input]', 'notlong'); // enter key triggers action

          await (0, _testHelpers.triggerKeyEvent)('[data-test-new-pass-input]', 'keyup', 13);
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-new-pass-input]').closest('.form-group'), 'new password has error class when password too short').to.have.class('error');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="user-new-pass"]').textContent, 'new password error when it\'s too short').to.have.string('at least 10 characters long'); // validates unsafe password

          await (0, _testHelpers.fillIn)('#user-password-new', 'ghostisawesome');
          await (0, _testHelpers.fillIn)('[data-test-ne2-pass-input]', 'ghostisawesome'); // enter key triggers action

          await (0, _testHelpers.triggerKeyEvent)('#user-password-new', 'keyup', 13);
          (0, _chai.expect)((0, _testHelpers.find)('#user-password-new').closest('.form-group'), 'new password has error class when password is insecure').to.have.class('error');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="user-new-pass"]').textContent, 'new password error when it\'s insecure').to.match(/you cannot use an insecure password/); // typing in inputs clears validation

          await (0, _testHelpers.fillIn)('[data-test-new-pass-input]', 'thisissupersafe');
          await (0, _testHelpers.triggerEvent)('[data-test-new-pass-input]', 'input');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-new-pass-input]').closest('.form-group'), 'password validation is visible after typing').to.not.have.class('error'); // enter key triggers action

          await (0, _testHelpers.triggerKeyEvent)('[data-test-new-pass-input]', 'keyup', 13);
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-ne2-pass-input]').closest('.form-group'), 'confirm password has error class when it doesn\'t match').to.have.class('error');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="user-ne2-pass"]').textContent, 'confirm password error when it doesn\'t match').to.have.string('do not match'); // submits with correct details

          await (0, _testHelpers.fillIn)('[data-test-ne2-pass-input]', 'thisissupersafe');
          await (0, _testHelpers.click)('[data-test-save-pw-button]'); // hits the endpoint

          let _this$server$pretende3 = this.server.pretender.handledRequests.slice(-1),
              _this$server$pretende4 = _slicedToArray(_this$server$pretende3, 1),
              newRequest = _this$server$pretende4[0];

          params = JSON.parse(newRequest.requestBody);
          (0, _chai.expect)(newRequest.url, 'password request URL').to.match(/\/users\/password/); // eslint-disable-next-line camelcase

          (0, _chai.expect)(params.password[0].user_id).to.equal(user.id.toString());
          (0, _chai.expect)(params.password[0].newPassword).to.equal('thisissupersafe');
          (0, _chai.expect)(params.password[0].ne2Password).to.equal('thisissupersafe'); // clears the fields

          (0, _chai.expect)((0, _testHelpers.find)('[data-test-new-pass-input]').value, 'password field after submit').to.be.empty;
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-ne2-pass-input]').value, 'password verification field after submit').to.be.empty; // displays a notification

          (0, _chai.expect)((0, _testHelpers.findAll)('.gh-notifications .gh-notification').length, 'password saved notification is displayed').to.equal(1);
        });
        (0, _mocha.it)('warns when leaving without saving', async function () {
          await (0, _visit.visit)('/staff/test-1');
          (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-1');
          await (0, _testHelpers.fillIn)('[data-test-slug-input]', 'another slug');
          await (0, _testHelpers.blur)('[data-test-slug-input]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-slug-input]').value).to.be.equal('another-slug');
          await (0, _testHelpers.fillIn)('[data-test-facebook-input]', 'testuser');
          await (0, _testHelpers.blur)('[data-test-facebook-input]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-facebook-input]').value).to.be.equal('https://www.facebook.com/testuser');
          await (0, _visit.visit)('/settings/staff');
          (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-modal]').length, 'modal exists').to.equal(1); // Leave without saving

          await (0, _testHelpers.click)('.fullscreen-modal [data-test-leave-button]');
          (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/staff');
          await (0, _visit.visit)('/staff/test-1');
          (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/staff/test-1'); // settings were not saved

          (0, _chai.expect)((0, _testHelpers.find)('[data-test-slug-input]').value).to.be.equal('test-1');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-facebook-input]').value).to.be.equal('https://www.facebook.com/test');
        });
      });
      (0, _mocha.describe)('own user', function () {
        (0, _mocha.it)('requires current password when changing password', async function () {
          await (0, _visit.visit)("/staff/".concat(admin.slug)); // test the "old password" field is validated

          await (0, _testHelpers.click)('[data-test-save-pw-button]'); // old password has error

          (0, _chai.expect)((0, _testHelpers.find)('[data-test-old-pass-input]').closest('.form-group'), 'old password has error class when blank').to.have.class('error');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="user-old-pass"]').textContent, 'old password error when blank').to.have.string('is required'); // new password has error

          (0, _chai.expect)((0, _testHelpers.find)('[data-test-new-pass-input]').closest('.form-group'), 'new password has error class when blank').to.have.class('error');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="user-new-pass"]').textContent, 'new password error when blank').to.have.string('can\'t be blank'); // validation is cleared when typing

          await (0, _testHelpers.fillIn)('[data-test-old-pass-input]', 'password');
          await (0, _testHelpers.triggerEvent)('[data-test-old-pass-input]', 'input');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-old-pass-input]').closest('.form-group'), 'old password validation is in error state after typing').to.not.have.class('error');
        });
      });
      (0, _mocha.it)('redirects to 404 when user does not exist', async function () {
        this.server.get('/users/slug/unknown/', function () {
          return new _emberCliMirage.Response(404, {
            'Content-Type': 'application/json'
          }, {
            errors: [{
              message: 'User not found.',
              type: 'NotFoundError'
            }]
          });
        });
        (0, _adapterError.errorOverride)();
        await (0, _visit.visit)('/staff/unknown');
        (0, _adapterError.errorReset)();
        (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('error404');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/staff/unknown');
      });
    });
    (0, _mocha.describe)('when logged in as author', function () {
      let adminRole, authorRole;
      (0, _mocha.beforeEach)(async function () {
        adminRole = this.server.create('role', {
          name: 'Administrator'
        });
        authorRole = this.server.create('role', {
          name: 'Author'
        });
        this.server.create('user', {
          roles: [authorRole]
        });
        this.server.get('/invites/', function () {
          return new _emberCliMirage.Response(403, {}, {
            errors: [{
              type: 'NoPermissionError',
              message: 'You do not have permission to perform this action'
            }]
          });
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('can access the staff page', async function () {
        this.server.create('user', {
          roles: [adminRole]
        });
        this.server.create('invite', {
          role: authorRole
        });
        (0, _adapterError.errorOverride)();
        await (0, _visit.visit)('/staff');
        (0, _adapterError.errorReset)();
        (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('staff.index');
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length).to.equal(0);
      });
    });
  });
});
define("ghost-admin/tests/acceptance/subscribers-test", ["ember-cli-mirage/test-support/setup-mirage", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ghost-admin/tests/helpers/file-upload", "ghost-admin/tests/helpers/find", "ember-mocha", "ghost-admin/tests/helpers/visit"], function (_setupMirage, _testSupport, _mocha, _testHelpers, _chai, _fileUpload, _find, _emberMocha, _visit) {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  (0, _mocha.describe)('Acceptance: Subscribers', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _setupMirage.default)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/subscribers');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/signin');
    });
    (0, _mocha.it)('redirects editors to posts', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role]
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/subscribers');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/site');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav="subscribers"]'), 'sidebar link').to.not.exist;
    });
    (0, _mocha.it)('redirects authors to posts', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role]
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/subscribers');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/site');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav="subscribers"]'), 'sidebar link').to.not.exist;
    });
    (0, _mocha.it)('redirects contributors to posts', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role]
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/subscribers');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/site');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav="subscribers"]'), 'sidebar link').to.not.exist;
    });
    (0, _mocha.describe)('an admin', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('can manage subscribers', async function () {
        this.server.createList('subscriber', 40);
        await (0, _visit.visit)('/');
        await (0, _testHelpers.click)('[data-test-nav="subscribers"]'); // it navigates to the correct page

        (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('subscribers.index'); // it has correct page title

        (0, _chai.expect)(document.title, 'page title').to.equal('Subscribers - Test Blog'); // it loads the first page
        // TODO: latest ember-in-viewport causes infinite scroll issues with
        // FF here where it loads two pages straight away so we need to check
        // if rows are greater than or equal to a single page

        (0, _chai.expect)((0, _testHelpers.findAll)('.subscribers-table .lt-body .lt-row').length, 'number of subscriber rows').to.be.at.least(30); // it shows the total number of subscribers

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-total-subscribers]').textContent.trim(), 'displayed subscribers total').to.equal('(40)'); // it defaults to sorting by created_at desc

        let _this$server$pretende = this.server.pretender.handledRequests.slice(-1),
            _this$server$pretende2 = _slicedToArray(_this$server$pretende, 1),
            lastRequest = _this$server$pretende2[0];

        (0, _chai.expect)(lastRequest.queryParams.order).to.equal('created_at desc');
        let createdAtHeader = (0, _find.findWithText)('.subscribers-table th', 'Subscription Date');
        (0, _chai.expect)(createdAtHeader, 'createdAt column is sorted').to.have.class('is-sorted');
        (0, _chai.expect)(createdAtHeader.querySelectorAll('.gh-icon-descending'), 'createdAt column has descending icon').to.exist; // click the column to re-order

        await (0, _testHelpers.click)((0, _find.findWithText)('th', 'Subscription Date')); // it flips the directions and re-fetches

        var _this$server$pretende3 = this.server.pretender.handledRequests.slice(-1);

        var _this$server$pretende4 = _slicedToArray(_this$server$pretende3, 1);

        lastRequest = _this$server$pretende4[0];
        (0, _chai.expect)(lastRequest.queryParams.order).to.equal('created_at asc');
        createdAtHeader = (0, _find.findWithText)('.subscribers-table th', 'Subscription Date');
        (0, _chai.expect)(createdAtHeader.querySelector('.gh-icon-ascending'), 'createdAt column has ascending icon').to.exist; // TODO: scroll test disabled as ember-light-table doesn't calculate
        // the scroll trigger element's positioning against the scroll
        // container - https://github.com/offirgolan/ember-light-table/issues/201
        //
        // // scroll to the bottom of the table to simulate infinite scroll
        // await find('.subscribers-table').scrollTop(find('.subscribers-table .ember-light-table').height() - 50);
        //
        // // trigger infinite scroll
        // await triggerEvent('.subscribers-table tbody', 'scroll');
        //
        // // it loads the next page
        // expect(find('.subscribers-table .lt-body .lt-row').length, 'number of subscriber rows after infinite-scroll')
        //     .to.equal(40);
        // click the add subscriber button

        await (0, _testHelpers.click)('[data-test-link="add-subscriber"]'); // it displays the add subscriber modal

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="new-subscriber"]'), 'add subscriber modal displayed').to.exist; // cancel the modal

        await (0, _testHelpers.click)('[data-test-button="cancel-new-subscriber"]'); // it closes the add subscriber modal

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal]'), 'add subscriber modal displayed after cancel').to.not.exist; // save a new subscriber

        await (0, _testHelpers.click)('[data-test-link="add-subscriber"]');
        await (0, _testHelpers.fillIn)('[data-test-input="new-subscriber-email"]', 'test@example.com');
        await (0, _testHelpers.click)('[data-test-button="create-subscriber"]'); // the add subscriber modal is closed

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal]'), 'add subscriber modal displayed after save').to.not.exist; // the subscriber is added to the table

        (0, _chai.expect)((0, _testHelpers.find)('.subscribers-table .lt-body .lt-row:first-of-type .lt-cell:first-of-type'), 'first email in list after addition').to.contain.text('test@example.com'); // the table is scrolled to the top
        // TODO: implement scroll to new record after addition
        // expect(find('.subscribers-table').scrollTop(), 'scroll position after addition')
        //     .to.equal(0);
        // the subscriber total is updated

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-total-subscribers]'), 'subscribers total after addition').to.have.trimmed.text('(41)'); // saving a duplicate subscriber

        await (0, _testHelpers.click)('[data-test-link="add-subscriber"]');
        await (0, _testHelpers.fillIn)('[data-test-input="new-subscriber-email"]', 'test@example.com');
        await (0, _testHelpers.click)('[data-test-button="create-subscriber"]'); // the validation error is displayed

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="new-subscriber-email"]'), 'duplicate email validation').to.have.trimmed.text('Email already exists.'); // the subscriber is not added to the table

        (0, _chai.expect)((0, _find.findAllWithText)('.lt-cell', 'test@example.com').length, 'number of "test@example.com rows"').to.equal(1); // the subscriber total is unchanged

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-total-subscribers]'), 'subscribers total after failed add').to.have.trimmed.text('(41)'); // deleting a subscriber

        await (0, _testHelpers.click)('[data-test-button="cancel-new-subscriber"]');
        await (0, _testHelpers.click)('.subscribers-table tbody tr:first-of-type button:last-of-type'); // it displays the delete subscriber modal

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="delete-subscriber"]'), 'delete subscriber modal displayed').to.exist; // cancel the modal

        await (0, _testHelpers.click)('[data-test-button="cancel-delete-subscriber"]'); // it closes the add subscriber modal

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal]'), 'delete subscriber modal displayed after cancel').to.not.exist;
        await (0, _testHelpers.click)('.subscribers-table tbody tr:first-of-type button:last-of-type');
        await (0, _testHelpers.click)('[data-test-button="confirm-delete-subscriber"]'); // the add subscriber modal is closed

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal]'), 'delete subscriber modal displayed after confirm').to.not.exist; // the subscriber is removed from the table

        (0, _chai.expect)((0, _testHelpers.find)('.subscribers-table .lt-body .lt-row:first-of-type .lt-cell:first-of-type'), 'first email in list after addition').to.not.have.trimmed.text('test@example.com'); // the subscriber total is updated

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-total-subscribers]'), 'subscribers total after addition').to.have.trimmed.text('(40)'); // click the import subscribers button

        await (0, _testHelpers.click)('[data-test-link="import-csv"]'); // it displays the import subscribers modal

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="import-subscribers"]'), 'import subscribers modal displayed').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('.fullscreen-modal input[type="file"]'), 'import modal contains file input').to.exist; // cancel the modal

        await (0, _testHelpers.click)('[data-test-button="close-import-subscribers"]'); // it closes the import subscribers modal

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal]'), 'import subscribers modal displayed after cancel').to.not.exist;
        await (0, _testHelpers.click)('[data-test-link="import-csv"]');
        await (0, _fileUpload.fileUpload)('.fullscreen-modal input[type="file"]', ['test'], {
          name: 'test.csv'
        }); // modal title changes

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="import-subscribers"] h1'), 'import modal title after import').to.have.trimmed.text('Import Successful'); // modal button changes

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="close-import-subscribers"]'), 'import modal button text after import').to.have.trimmed.text('Close'); // subscriber total is updated

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-total-subscribers]'), 'subscribers total after import').to.have.trimmed.text('(90)'); // TODO: re-enable once bug in ember-light-table that triggers second page load is fixed
        // table is reset
        // [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        // expect(lastRequest.url, 'endpoint requested after import')
        //     .to.match(/\/subscribers\/\?/);
        // expect(lastRequest.queryParams.page, 'page requested after import')
        //     .to.equal('1');
        // expect(find('.subscribers-table .lt-body .lt-row').length, 'number of rows in table after import')
        //     .to.equal(30);
        // close modal
      });
    });
  });
});
define("ghost-admin/tests/helpers/adapter-error", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.errorOverride = errorOverride;
  _exports.errorReset = errorReset;
  // eslint-disable-line
  // This is needed for testing error responses in acceptance tests
  // See http://williamsbdev.com/posts/testing-rsvp-errors-handled-globally/
  // ember-cli-shims doesn't export Logger
  const Logger = Ember.Logger;
  let originalException, originalLoggerError;

  function errorOverride() {
    originalException = Ember.Test.adapter.exception;
    originalLoggerError = Logger.error;

    Ember.Test.adapter.exception = function () {};

    Logger.error = function () {};
  }

  function errorReset() {
    Ember.Test.adapter.exception = originalException;
    Logger.error = originalLoggerError;
  }
});
define("ghost-admin/tests/helpers/data-transfer", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var c = Ember.Object.extend({
    getData: function getData() {
      return this.get('payload');
    },
    setData: function setData(dataType, payload) {
      this.set("data", {
        dataType: dataType,
        payload: payload
      });
    }
  });
  c.reopenClass({
    makeMockEvent: function makeMockEvent(payload) {
      var transfer = this.create({
        payload: payload
      });
      var res = {
        dataTransfer: transfer
      };
      res.originalEvent = res;

      res.originalEvent.preventDefault = function () {
        console.log('prevent default');
      };

      res.originalEvent.stopPropagation = function () {
        console.log('stop propagation');
      };

      return res;
    },
    createDomEvent: function createDomEvent(type) {
      var event = document.createEvent("CustomEvent");
      event.initCustomEvent(type, true, true, null);
      event.dataTransfer = {
        data: {},
        setData: function setData(type, val) {
          this.data[type] = val;
        },
        getData: function getData(type) {
          return this.data[type];
        }
      };
      return event;
    }
  });
  var _default = c;
  _exports.default = _default;
});
define("ghost-admin/tests/helpers/drag-drop", ["exports", "ember-native-dom-helpers", "ghost-admin/tests/helpers/mock-event"], function (_exports, _emberNativeDomHelpers, _mockEvent) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.drag = drag;

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  async function dragOver(dropSelector, moves) {
    moves = moves || [[{
      clientX: 1,
      clientY: 1
    }, dropSelector]];
    return moves.forEach(async (_ref) => {
      let _ref2 = _slicedToArray(_ref, 2),
          position = _ref2[0],
          selector = _ref2[1];

      let event = new _mockEvent.default(position);
      await (0, _emberNativeDomHelpers.triggerEvent)(selector || dropSelector, 'dragover', event);
    });
  }

  async function drop(dragSelector, dragEvent, options) {
    let dropSelector = options.drop,
        dropEndOptions = options.dropEndOptions,
        dragOverMoves = options.dragOverMoves;
    let dropElement = await (0, _emberNativeDomHelpers.find)(dropSelector);

    if (!dropElement) {
      throw "There are no drop targets by the given selector: '".concat(dropSelector, "'");
    }

    await dragOver(dropSelector, dragOverMoves);

    if (options.beforeDrop) {
      await options.beforeDrop.call();
    }

    let event = new _mockEvent.default().useDataTransferData(dragEvent);
    await (0, _emberNativeDomHelpers.triggerEvent)(dropSelector, 'drop', event);
    return await (0, _emberNativeDomHelpers.triggerEvent)(dragSelector, 'dragend', dropEndOptions);
  }

  async function drag(dragSelector) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let dragEvent = new _mockEvent.default(options.dragStartOptions);
    await (0, _emberNativeDomHelpers.triggerEvent)(dragSelector, 'mouseover');
    await (0, _emberNativeDomHelpers.triggerEvent)(dragSelector, 'dragstart', dragEvent);

    if (options.afterDrag) {
      await options.afterDrag.call();
    }

    if (options.drop) {
      await drop(dragSelector, dragEvent, options);
    }
  }
});
define("ghost-admin/tests/helpers/ember-drag-drop", ["exports", "jquery", "ghost-admin/tests/helpers/data-transfer"], function (_exports, _jquery, _dataTransfer) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.drag = drag;

  function drop($dragHandle, dropCssPath, dragEvent) {
    let $dropTarget = (0, _jquery.default)(dropCssPath);

    if ($dropTarget.length === 0) {
      throw "There are no drop targets by the given selector: '".concat(dropCssPath, "'");
    }

    Ember.run(() => {
      triggerEvent($dropTarget, 'dragover', _dataTransfer.default.makeMockEvent());
    });
    Ember.run(() => {
      triggerEvent($dropTarget, 'drop', _dataTransfer.default.makeMockEvent(dragEvent.dataTransfer.get('data.payload')));
    });
    Ember.run(() => {
      triggerEvent($dragHandle, 'dragend', _dataTransfer.default.makeMockEvent());
    });
  }

  function drag(cssPath) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    let dragEvent = _dataTransfer.default.makeMockEvent();

    let $dragHandle = (0, _jquery.default)(cssPath);
    Ember.run(() => {
      triggerEvent($dragHandle, 'mouseover');
    });
    Ember.run(() => {
      triggerEvent($dragHandle, 'dragstart', dragEvent);
    });
    andThen(function () {
      if (options.beforeDrop) {
        options.beforeDrop.call();
      }
    });
    andThen(function () {
      if (options.drop) {
        drop($dragHandle, options.drop, dragEvent);
      }
    });
  }
});
define("ghost-admin/tests/helpers/ember-power-calendar", ["exports", "ember-power-calendar/test-support"], function (_exports, _testSupport) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = _default;

  function _default() {
    Ember.Test.registerAsyncHelper('calendarCenter', async function (app, selector, newCenter) {
      return (0, _testSupport.calendarCenter)(selector, newCenter);
    });
    Ember.Test.registerAsyncHelper('calendarSelect', async function (app, selector, selected) {
      return (0, _testSupport.calendarSelect)(selector, selected);
    });
  }
});
define("ghost-admin/tests/helpers/ember-power-select", ["exports", "ember-power-select/test-support/helpers"], function (_exports, _helpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = deprecatedRegisterHelpers;
  _exports.selectChoose = _exports.touchTrigger = _exports.nativeTouch = _exports.clickTrigger = _exports.typeInSearch = _exports.triggerKeydown = _exports.nativeMouseUp = _exports.nativeMouseDown = _exports.findContains = void 0;

  function deprecateHelper(fn, name) {
    return function () {
      (true && !(false) && Ember.deprecate("DEPRECATED `import { ".concat(name, " } from '../../tests/helpers/ember-power-select';` is deprecated. Please, replace it with `import { ").concat(name, " } from 'ember-power-select/test-support/helpers';`"), false, {
        until: '1.11.0',
        id: "ember-power-select-test-support-".concat(name)
      }));
      return fn(...arguments);
    };
  }

  let findContains = deprecateHelper(_helpers.findContains, 'findContains');
  _exports.findContains = findContains;
  let nativeMouseDown = deprecateHelper(_helpers.nativeMouseDown, 'nativeMouseDown');
  _exports.nativeMouseDown = nativeMouseDown;
  let nativeMouseUp = deprecateHelper(_helpers.nativeMouseUp, 'nativeMouseUp');
  _exports.nativeMouseUp = nativeMouseUp;
  let triggerKeydown = deprecateHelper(_helpers.triggerKeydown, 'triggerKeydown');
  _exports.triggerKeydown = triggerKeydown;
  let typeInSearch = deprecateHelper(_helpers.typeInSearch, 'typeInSearch');
  _exports.typeInSearch = typeInSearch;
  let clickTrigger = deprecateHelper(_helpers.clickTrigger, 'clickTrigger');
  _exports.clickTrigger = clickTrigger;
  let nativeTouch = deprecateHelper(_helpers.nativeTouch, 'nativeTouch');
  _exports.nativeTouch = nativeTouch;
  let touchTrigger = deprecateHelper(_helpers.touchTrigger, 'touchTrigger');
  _exports.touchTrigger = touchTrigger;
  let selectChoose = deprecateHelper(_helpers.selectChoose, 'selectChoose');
  _exports.selectChoose = selectChoose;

  function deprecatedRegisterHelpers() {
    (true && !(false) && Ember.deprecate("DEPRECATED `import registerPowerSelectHelpers from '../../tests/helpers/ember-power-select';` is deprecated. Please, replace it with `import registerPowerSelectHelpers from 'ember-power-select/test-support/helpers';`", false, {
      until: '1.11.0',
      id: 'ember-power-select-test-support-register-helpers'
    }));
    return (0, _helpers.default)();
  }
});
define("ghost-admin/tests/helpers/ember-simple-auth", ["exports", "ember-simple-auth/authenticators/test"], function (_exports, _test) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.authenticateSession = authenticateSession;
  _exports.currentSession = currentSession;
  _exports.invalidateSession = invalidateSession;
  const TEST_CONTAINER_KEY = 'authenticator:test';

  function ensureAuthenticator(app, container) {
    const authenticator = container.lookup(TEST_CONTAINER_KEY);

    if (!authenticator) {
      app.register(TEST_CONTAINER_KEY, _test.default);
    }
  }

  function authenticateSession(app, sessionData) {
    const container = app.__container__;
    const session = container.lookup('service:session');
    ensureAuthenticator(app, container);
    session.authenticate(TEST_CONTAINER_KEY, sessionData);
    return app.testHelpers.wait();
  }

  function currentSession(app) {
    return app.__container__.lookup('service:session');
  }

  function invalidateSession(app) {
    const session = app.__container__.lookup('service:session');

    if (session.get('isAuthenticated')) {
      session.invalidate();
    }

    return app.testHelpers.wait();
  }
});
define("ghost-admin/tests/helpers/file-upload", ["exports", "@ember/test-helpers"], function (_exports, _testHelpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.createFile = createFile;
  _exports.fileUpload = fileUpload;

  function createFile() {
    let content = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : ['test'];
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let name = options.name,
        type = options.type;
    let file = new Blob(content, {
      type: type ? type : 'text/plain'
    });
    file.name = name ? name : 'test.txt';
    return file;
  }

  function fileUpload(target, content, options) {
    let file = createFile(content, options); // TODO: replace `[file]` with `{files: [file]}` after upgrading ember-test-helpers

    return (0, _testHelpers.triggerEvent)(target, 'change', [file]);
  }
});
define("ghost-admin/tests/helpers/find", ["exports", "@ember/test-helpers"], function (_exports, _testHelpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.elementHasText = elementHasText;
  _exports.findWithText = findWithText;
  _exports.findAllWithText = findAllWithText;

  function elementHasText(element, text) {
    return RegExp(text).test(element.textContent);
  }

  function findWithText(selector, text) {
    return Array.from((0, _testHelpers.findAll)(selector)).find(element => elementHasText(element, text));
  }

  function findAllWithText(selector, text) {
    return Array.from((0, _testHelpers.findAll)(selector)).filter(element => elementHasText(element, text));
  }
});
define("ghost-admin/tests/helpers/mock-event", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.createDomEvent = createDomEvent;
  _exports.default = void 0;

  class DataTransfer {
    constructor() {
      this.data = {};
    }

    setData(type, value) {
      this.data[type] = value;
      return this;
    }

    getData() {
      let type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "Text";
      return this.data[type];
    }

    setDragImage() {}

  }

  class MockEvent {
    constructor() {
      let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      this.dataTransfer = new DataTransfer();
      this.dataTransfer.setData('Text', options.dataTransferData);
      this.originalEvent = this;
      this.setProperties(options);
    }

    useDataTransferData(otherEvent) {
      this.dataTransfer.setData('Text', otherEvent.dataTransfer.getData());
      return this;
    }

    setProperties(props) {
      for (let prop in props) {
        this[prop] = props[prop];
      }

      return this;
    }

    preventDefault() {}

    stopPropagation() {}

  }

  _exports.default = MockEvent;

  function createDomEvent(type) {
    let event = document.createEvent("CustomEvent");
    event.initCustomEvent(type, true, true, null);
    event.dataTransfer = new DataTransfer();
    return event;
  }
});
define("ghost-admin/tests/helpers/resolver", ["exports", "ghost-admin/resolver", "ghost-admin/config/environment"], function (_exports, _resolver, _environment) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  const resolver = _resolver.default.create();

  resolver.namespace = {
    modulePrefix: _environment.default.modulePrefix,
    podModulePrefix: _environment.default.podModulePrefix
  };
  var _default = resolver;
  _exports.default = _default;
});
define("ghost-admin/tests/helpers/visit", ["exports", "@ember/test-helpers"], function (_exports, _testHelpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.visit = visit;

  // TODO: remove once bug is fixed in Ember
  // see https://github.com/emberjs/ember-test-helpers/issues/332
  async function visit(url) {
    try {
      await (0, _testHelpers.visit)(url);
    } catch (e) {
      if (e.message !== 'TransitionAborted') {
        throw e;
      }
    }

    await (0, _testHelpers.settled)();
  }
});
define("ghost-admin/tests/integration/adapters/tag-test", ["pretender", "mocha", "chai", "ember-mocha"], function (_pretender, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Adapter: tag', function () {
    (0, _emberMocha.setupTest)('adapter:tag', {
      integration: true
    });
    let server, store;
    beforeEach(function () {
      store = this.container.lookup('service:store');
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('loads tags from regular endpoint when all are fetched', function (done) {
      server.get('/ghost/api/v2/admin/tags/', function () {
        return [200, {
          'Content-Type': 'application/json'
        }, JSON.stringify({
          tags: [{
            id: 1,
            name: 'Tag 1',
            slug: 'tag-1'
          }, {
            id: 2,
            name: 'Tag 2',
            slug: 'tag-2'
          }]
        })];
      });
      store.findAll('tag', {
        reload: true
      }).then(tags => {
        (0, _chai.expect)(tags).to.be.ok;
        (0, _chai.expect)(tags.objectAtContent(0).get('name')).to.equal('Tag 1');
        done();
      });
    });
    (0, _mocha.it)('loads tag from slug endpoint when single tag is queried and slug is passed in', function (done) {
      server.get('/ghost/api/v2/admin/tags/slug/tag-1/', function () {
        return [200, {
          'Content-Type': 'application/json'
        }, JSON.stringify({
          tags: [{
            id: 1,
            slug: 'tag-1',
            name: 'Tag 1'
          }]
        })];
      });
      store.queryRecord('tag', {
        slug: 'tag-1'
      }).then(tag => {
        (0, _chai.expect)(tag).to.be.ok;
        (0, _chai.expect)(tag.get('name')).to.equal('Tag 1');
        done();
      });
    });
  });
});
define("ghost-admin/tests/integration/adapters/user-test", ["pretender", "mocha", "chai", "ember-mocha"], function (_pretender, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Adapter: user', function () {
    (0, _emberMocha.setupTest)('adapter:user', {
      integration: true
    });
    let server, store;
    beforeEach(function () {
      store = this.container.lookup('service:store');
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('loads users from regular endpoint when all are fetched', function (done) {
      server.get('/ghost/api/v2/admin/users/', function () {
        return [200, {
          'Content-Type': 'application/json'
        }, JSON.stringify({
          users: [{
            id: 1,
            name: 'User 1',
            slug: 'user-1'
          }, {
            id: 2,
            name: 'User 2',
            slug: 'user-2'
          }]
        })];
      });
      store.findAll('user', {
        reload: true
      }).then(users => {
        (0, _chai.expect)(users).to.be.ok;
        (0, _chai.expect)(users.objectAtContent(0).get('name')).to.equal('User 1');
        done();
      });
    });
    (0, _mocha.it)('loads user from slug endpoint when single user is queried and slug is passed in', function (done) {
      server.get('/ghost/api/v2/admin/users/slug/user-1/', function () {
        return [200, {
          'Content-Type': 'application/json'
        }, JSON.stringify({
          users: [{
            id: 1,
            slug: 'user-1',
            name: 'User 1'
          }]
        })];
      });
      store.queryRecord('user', {
        slug: 'user-1'
      }).then(user => {
        (0, _chai.expect)(user).to.be.ok;
        (0, _chai.expect)(user.get('name')).to.equal('User 1');
        done();
      });
    });
    (0, _mocha.it)('handles "include" parameter when querying single user via slug', function (done) {
      server.get('/ghost/api/v2/admin/users/slug/user-1/', request => {
        let params = request.queryParams;
        (0, _chai.expect)(params.include, 'include query').to.equal('roles,count.posts');
        return [200, {
          'Content-Type': 'application/json'
        }, JSON.stringify({
          users: [{
            id: 1,
            slug: 'user-1',
            name: 'User 1',
            count: {
              posts: 5
            }
          }]
        })];
      });
      store.queryRecord('user', {
        slug: 'user-1',
        include: 'count.posts'
      }).then(user => {
        (0, _chai.expect)(user).to.be.ok;
        (0, _chai.expect)(user.get('name')).to.equal('User 1');
        (0, _chai.expect)(user.get('count.posts')).to.equal(5);
        done();
      });
    });
  });
});
define("ghost-admin/tests/integration/components/gh-alert-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-alert', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders', async function () {
      this.set('message', {
        message: 'Test message',
        type: 'success'
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "MrX1+PQS",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-alert\",null,[[\"message\"],[[25,[\"message\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      let alert = this.element.querySelector('article.gh-alert');
      (0, _chai.expect)(alert).to.exist;
      (0, _chai.expect)(alert).to.contain.text('Test message');
    });
    (0, _mocha.it)('maps message types to CSS classes', async function () {
      this.set('message', {
        message: 'Test message',
        type: 'success'
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "MrX1+PQS",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-alert\",null,[[\"message\"],[[25,[\"message\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      let alert = this.element.querySelector('article.gh-alert');
      this.set('message.type', 'success');
      (0, _chai.expect)(alert, 'success class is green').to.have.class('gh-alert-green');
      this.set('message.type', 'error');
      (0, _chai.expect)(alert, 'error class is red').to.have.class('gh-alert-red');
      this.set('message.type', 'warn');
      (0, _chai.expect)(alert, 'warn class is yellow').to.have.class('gh-alert-blue');
      this.set('message.type', 'info');
      (0, _chai.expect)(alert, 'info class is blue').to.have.class('gh-alert-blue');
    });
  });
});
define("ghost-admin/tests/integration/components/gh-alerts-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  let notificationsStub = Ember.Service.extend({
    alerts: Ember.A()
  });
  (0, _mocha.describe)('Integration: Component: gh-alerts', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      this.owner.register('service:notifications', notificationsStub);
      let notifications = this.owner.lookup('service:notifications');
      notifications.set('alerts', [{
        message: 'First',
        type: 'error'
      }, {
        message: 'Second',
        type: 'warn'
      }]);
    });
    (0, _mocha.it)('renders', async function () {
      let notifications = this.owner.lookup('service:notifications');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "0QRLZ9qB",
        "block": "{\"symbols\":[],\"statements\":[[1,[23,\"gh-alerts\"],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alerts').length).to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.gh-alerts').children.length).to.equal(2);
      notifications.set('alerts', Ember.A());
      await (0, _testHelpers.settled)();
      (0, _chai.expect)((0, _testHelpers.find)('.gh-alerts').children.length).to.equal(0);
    });
    (0, _mocha.it)('triggers "notify" action when message count changes', async function () {
      let notifications = this.owner.lookup('service:notifications');
      let expectedCount = 0; // test double for notify action

      this.set('notify', count => (0, _chai.expect)(count).to.equal(expectedCount));
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "u6LDMyzP",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-alerts\",null,[[\"notify\"],[[29,\"action\",[[24,0,[]],[25,[\"notify\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      expectedCount = 3;
      notifications.alerts.pushObject({
        message: 'Third',
        type: 'success'
      });
      await (0, _testHelpers.settled)();
      expectedCount = 0;
      notifications.set('alerts', Ember.A());
      await (0, _testHelpers.settled)();
    });
  });
});
define("ghost-admin/tests/integration/components/gh-basic-dropdown-test", ["ember-basic-dropdown/test-support/helpers", "mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_helpers, _mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-basic-dropdown', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('closes when dropdown service fires close event', async function () {
      let dropdownService = this.owner.lookup('service:dropdown');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "mSCFaJcZ",
        "block": "{\"symbols\":[\"dropdown\"],\"statements\":[[0,\"\\n\"],[4,\"gh-basic-dropdown\",null,null,{\"statements\":[[0,\"                \"],[7,\"button\"],[11,\"class\",\"ember-basic-dropdown-trigger\"],[12,\"onclick\",[24,1,[\"actions\",\"toggle\"]]],[9],[10],[0,\"\\n\"],[4,\"if\",[[24,1,[\"isOpen\"]]],null,{\"statements\":[[0,\"                    \"],[7,\"div\"],[11,\"id\",\"dropdown-is-opened\"],[9],[10],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[1]},null],[0,\"        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _helpers.clickTrigger)();
      (0, _chai.expect)((0, _testHelpers.find)('#dropdown-is-opened')).to.exist;
      dropdownService.closeDropdowns();
      await (0, _testHelpers.settled)();
      (0, _chai.expect)((0, _testHelpers.find)('#dropdown-is-opened')).to.not.exist;
    });
  });
});
define("ghost-admin/tests/integration/components/gh-cm-editor-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  // NOTE: If the browser window is not focused/visible CodeMirror (or Chrome?) will
  // take longer to respond to/fire events so it's possible that some of these tests
  // will take 1-3 seconds
  (0, _mocha.describe)('Integration: Component: gh-cm-editor', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('handles change event', async function () {
      this.set('text', '');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "PS3wVaUy",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-cm-editor\",[[25,[\"text\"]]],[[\"class\",\"update\"],[\"gh-input\",[29,\"action\",[[24,0,[]],[29,\"mut\",[[25,[\"text\"]]],null]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      })); // access CodeMirror directly as it doesn't pick up changes to the textarea

      let cm = (0, _testHelpers.find)('.gh-input .CodeMirror').CodeMirror;
      cm.setValue('Testing');
      await (0, _testHelpers.settled)();
      (0, _chai.expect)(this.get('text'), 'text value after CM editor change').to.equal('Testing');
    });
    (0, _mocha.it)('can autofocus', async function () {
      // CodeMirror's events are triggered outside of anything we can watch for
      // in the tests so let's run the class check when we know the event has
      // been fired and timeout if it's not fired as we expect
      let onFocus = async () => {
        // wait for runloop to finish so that the new class has been rendered
        await (0, _testHelpers.settled)();
        (0, _chai.expect)((0, _testHelpers.find)('.gh-input').classList.contains('focus'), 'has focused class on first render with autofocus').to.be.true;
      };

      this.set('onFocus', onFocus);
      this.set('text', '');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "YSC00Aa8",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-cm-editor\",[[25,[\"text\"]]],[[\"class\",\"update\",\"autofocus\",\"focus-in\"],[\"gh-input\",[29,\"action\",[[24,0,[]],[29,\"mut\",[[25,[\"text\"]]],null]],null],true,[29,\"action\",[[24,0,[]],[25,[\"onFocus\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
    });
  });
});
define("ghost-admin/tests/integration/components/gh-download-count-test", ["pretender", "mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_pretender, _mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-download-count', function () {
    (0, _emberMocha.setupRenderingTest)();
    let server;
    beforeEach(function () {
      server = new _pretender.default();
      server.get('https://count.ghost.org/', function () {
        return [200, {}, JSON.stringify({
          count: 42
        })];
      });
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('hits count endpoint and renders', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "57WHsc7k",
        "block": "{\"symbols\":[],\"statements\":[[1,[23,\"gh-download-count\"],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text('42');
    });
    (0, _mocha.it)('renders with a block', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "1CmH0DRo",
        "block": "{\"symbols\":[\"count\"],\"statements\":[[0,\"\\n\"],[4,\"gh-download-count\",null,null,{\"statements\":[[0,\"                \"],[1,[24,1,[]],false],[0,\" downloads\\n\"]],\"parameters\":[1]},null],[0,\"        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text('42 downloads');
    });
  });
});
define("ghost-admin/tests/integration/components/gh-feature-flag-test", ["@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  const featureStub = Ember.Service.extend({
    testFlag: true
  });
  (0, _mocha.describe)('Integration: Component: gh-feature-flag', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      this.owner.register('service:feature', featureStub);
    });
    (0, _mocha.it)('renders properties correctly', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "G+symXiY",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-feature-flag\",[\"testFlag\"],null],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('label').getAttribute('for')).to.equal((0, _testHelpers.find)('input[type="checkbox"]').id);
    });
    (0, _mocha.it)('renders correctly when flag is set to true', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "G+symXiY",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-feature-flag\",[\"testFlag\"],null],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('label input[type="checkbox"]').checked).to.be.true;
    });
    (0, _mocha.it)('renders correctly when flag is set to false', async function () {
      let feature = this.owner.lookup('service:feature');
      feature.set('testFlag', false);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "G+symXiY",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-feature-flag\",[\"testFlag\"],null],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('label input[type="checkbox"]').checked).to.be.false;
    });
    (0, _mocha.it)('updates to reflect changes in flag property', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "G+symXiY",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-feature-flag\",[\"testFlag\"],null],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('label input[type="checkbox"]').checked).to.be.true;
      await (0, _testHelpers.click)('label');
      (0, _chai.expect)((0, _testHelpers.find)('label input[type="checkbox"]').checked).to.be.false;
    });
  });
});
define("ghost-admin/tests/integration/components/gh-file-uploader-test", ["jquery", "pretender", "sinon", "ghost-admin/services/ajax", "@ember/test-helpers", "ghost-admin/tests/helpers/file-upload", "mocha", "chai", "ember-mocha"], function (_jquery, _pretender, _sinon, _ajax, _testHelpers, _fileUpload, _mocha, _chai, _emberMocha) {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  const notificationsStub = Ember.Service.extend({
    showAPIError() {// noop - to be stubbed
    }

  });

  const stubSuccessfulUpload = function stubSuccessfulUpload(server) {
    let delay = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    server.post('/ghost/api/v2/admin/images/', function () {
      return [200, {
        'Content-Type': 'application/json'
      }, '{"url":"/content/images/test.png"}'];
    }, delay);
  };

  const stubFailedUpload = function stubFailedUpload(server, code, error) {
    let delay = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    server.post('/ghost/api/v2/admin/images/', function () {
      return [code, {
        'Content-Type': 'application/json'
      }, JSON.stringify({
        errors: [{
          type: error,
          message: "Error: ".concat(error)
        }]
      })];
    }, delay);
  };

  (0, _mocha.describe)('Integration: Component: gh-file-uploader', function () {
    (0, _emberMocha.setupRenderingTest)();
    let server;
    beforeEach(function () {
      server = new _pretender.default();
      this.set('uploadUrl', '/ghost/api/v2/admin/images/');
      this.owner.register('service:notifications', notificationsStub);
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('renders', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "4h7YSWbN",
        "block": "{\"symbols\":[],\"statements\":[[1,[23,\"gh-file-uploader\"],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('label').textContent.trim(), 'default label').to.equal('Select or drag-and-drop a file');
    });
    (0, _mocha.it)('allows file input "accept" attribute to be changed', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "4h7YSWbN",
        "block": "{\"symbols\":[],\"statements\":[[1,[23,\"gh-file-uploader\"],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input[type="file"]').getAttribute('accept'), 'default "accept" attribute').to.equal('text/csv');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "AFUbEaGA",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"accept\"],[\"application/zip\"]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input[type="file"]').getAttribute('accept'), 'specified "accept" attribute').to.equal('application/zip');
    });
    (0, _mocha.it)('renders form with supplied label text', async function () {
      this.set('labelText', 'My label');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "x1K3qRT4",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"labelText\"],[[25,[\"labelText\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('label').textContent.trim(), 'label').to.equal('My label');
    });
    (0, _mocha.it)('generates request to supplied endpoint', async function () {
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "vYIz5idS",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\"],[[25,[\"uploadUrl\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)(server.handledRequests.length).to.equal(1);
      (0, _chai.expect)(server.handledRequests[0].url).to.equal('/ghost/api/v2/admin/images/');
    });
    (0, _mocha.it)('fires uploadSuccess action on successful upload', async function () {
      let uploadSuccess = _sinon.default.spy();

      this.set('uploadSuccess', uploadSuccess);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "WKe7SlaJ",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\",\"uploadSuccess\"],[[25,[\"uploadUrl\"]],[29,\"action\",[[24,0,[]],[25,[\"uploadSuccess\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)(uploadSuccess.calledOnce).to.be.true;
      (0, _chai.expect)(uploadSuccess.firstCall.args[0]).to.eql({
        url: '/content/images/test.png'
      });
    });
    (0, _mocha.it)('doesn\'t fire uploadSuccess action on failed upload', async function () {
      let uploadSuccess = _sinon.default.spy();

      this.set('uploadSuccess', uploadSuccess);
      stubFailedUpload(server, 500);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "WKe7SlaJ",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\",\"uploadSuccess\"],[[25,[\"uploadUrl\"]],[29,\"action\",[[24,0,[]],[25,[\"uploadSuccess\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      await (0, _testHelpers.settled)();
      (0, _chai.expect)(uploadSuccess.calledOnce).to.be.false;
    });
    (0, _mocha.it)('fires fileSelected action on file selection', async function () {
      let fileSelected = _sinon.default.spy();

      this.set('fileSelected', fileSelected);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "pdE7ARYd",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\",\"fileSelected\"],[[25,[\"uploadUrl\"]],[29,\"action\",[[24,0,[]],[25,[\"fileSelected\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)(fileSelected.calledOnce).to.be.true;
      (0, _chai.expect)(fileSelected.args[0]).to.not.be.empty;
    });
    (0, _mocha.it)('fires uploadStarted action on upload start', async function () {
      let uploadStarted = _sinon.default.spy();

      this.set('uploadStarted', uploadStarted);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "POtjW+hW",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\",\"uploadStarted\"],[[25,[\"uploadUrl\"]],[29,\"action\",[[24,0,[]],[25,[\"uploadStarted\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)(uploadStarted.calledOnce).to.be.true;
    });
    (0, _mocha.it)('fires uploadFinished action on successful upload', async function () {
      let uploadFinished = _sinon.default.spy();

      this.set('uploadFinished', uploadFinished);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "RKRAhOKM",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\",\"uploadFinished\"],[[25,[\"uploadUrl\"]],[29,\"action\",[[24,0,[]],[25,[\"uploadFinished\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)(uploadFinished.calledOnce).to.be.true;
    });
    (0, _mocha.it)('fires uploadFinished action on failed upload', async function () {
      let uploadFinished = _sinon.default.spy();

      this.set('uploadFinished', uploadFinished);
      stubFailedUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "RKRAhOKM",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\",\"uploadFinished\"],[[25,[\"uploadUrl\"]],[29,\"action\",[[24,0,[]],[25,[\"uploadFinished\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)(uploadFinished.calledOnce).to.be.true;
    });
    (0, _mocha.it)('displays invalid file type error', async function () {
      stubFailedUpload(server, 415, 'UnsupportedMediaTypeError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "vYIz5idS",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\"],[[25,[\"uploadUrl\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The file type you uploaded is not supported/);
      (0, _chai.expect)((0, _testHelpers.findAll)('.gh-btn-green').length, 'reset button is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.gh-btn-green').textContent).to.equal('Try Again');
    });
    (0, _mocha.it)('displays file too large for server error', async function () {
      stubFailedUpload(server, 413, 'RequestEntityTooLargeError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "vYIz5idS",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\"],[[25,[\"uploadUrl\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The file you uploaded was larger/);
    });
    (0, _mocha.it)('handles file too large error directly from the web server', async function () {
      server.post('/ghost/api/v2/admin/images/', function () {
        return [413, {}, ''];
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "vYIz5idS",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\"],[[25,[\"uploadUrl\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The file you uploaded was larger/);
    });
    (0, _mocha.it)('displays other server-side error with message', async function () {
      stubFailedUpload(server, 400, 'UnknownError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "vYIz5idS",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\"],[[25,[\"uploadUrl\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/Error: UnknownError/);
    });
    (0, _mocha.it)('handles unknown failure', async function () {
      server.post('/ghost/api/v2/admin/images/', function () {
        return [500, {
          'Content-Type': 'application/json'
        }, ''];
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "vYIz5idS",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\"],[[25,[\"uploadUrl\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/Something went wrong/);
    });
    (0, _mocha.it)('triggers notifications.showAPIError for VersionMismatchError', async function () {
      let showAPIError = _sinon.default.spy();

      let notifications = this.owner.lookup('service:notifications');
      notifications.set('showAPIError', showAPIError);
      stubFailedUpload(server, 400, 'VersionMismatchError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "vYIz5idS",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\"],[[25,[\"uploadUrl\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)(showAPIError.calledOnce).to.be.true;
    });
    (0, _mocha.it)('doesn\'t trigger notifications.showAPIError for other errors', async function () {
      let showAPIError = _sinon.default.spy();

      let notifications = this.owner.lookup('service:notifications');
      notifications.set('showAPIError', showAPIError);
      stubFailedUpload(server, 400, 'UnknownError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "vYIz5idS",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\"],[[25,[\"uploadUrl\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)(showAPIError.called).to.be.false;
    });
    (0, _mocha.it)('can be reset after a failed upload', async function () {
      stubFailedUpload(server, 400, 'UnknownError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "vYIz5idS",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\"],[[25,[\"uploadUrl\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      await (0, _testHelpers.click)('.gh-btn-green');
      (0, _chai.expect)((0, _testHelpers.findAll)('input[type="file"]').length).to.equal(1);
    }); // skipped due to random failures on Travis - https://github.com/TryGhost/Ghost/issues/10308

    _mocha.it.skip('displays upload progress', async function () {
      // pretender fires a progress event every 50ms
      stubSuccessfulUpload(server, 150);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "vYIz5idS",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\"],[[25,[\"uploadUrl\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      }); // TODO: replace with waitFor/waitUntil helpers
      // after 75ms we should have had one progress event

      Ember.run.later(this, function () {
        (0, _chai.expect)((0, _testHelpers.findAll)('.progress .bar').length).to.equal(1);

        let _find$getAttribute$ma = (0, _testHelpers.find)('.progress .bar').getAttribute('style').match(/width: (\d+)%?/),
            _find$getAttribute$ma2 = _slicedToArray(_find$getAttribute$ma, 2),
            percentageWidth = _find$getAttribute$ma2[1];

        percentageWidth = Number.parseInt(percentageWidth);
        (0, _chai.expect)(percentageWidth).to.be.above(0);
        (0, _chai.expect)(percentageWidth).to.be.below(100);
      }, 75);
      await (0, _testHelpers.settled)();
    });

    (0, _mocha.it)('handles drag over/leave', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "4h7YSWbN",
        "block": "{\"symbols\":[],\"statements\":[[1,[23,\"gh-file-uploader\"],false]],\"hasEval\":false}",
        "meta": {}
      }));
      Ember.run(() => {
        // eslint-disable-next-line new-cap
        let dragover = _jquery.default.Event('dragover', {
          dataTransfer: {
            files: []
          }
        });

        this.$('.gh-image-uploader').trigger(dragover);
      });
      await (0, _testHelpers.settled)();
      (0, _chai.expect)((0, _testHelpers.find)('.gh-image-uploader').classList.contains('-drag-over'), 'has drag-over class').to.be.true;
      await (0, _testHelpers.triggerEvent)('.gh-image-uploader', 'dragleave');
      (0, _chai.expect)((0, _testHelpers.find)('.gh-image-uploader').classList.contains('-drag-over'), 'has drag-over class').to.be.false;
    });
    (0, _mocha.it)('triggers file upload on file drop', async function () {
      let uploadSuccess = _sinon.default.spy(); // eslint-disable-next-line new-cap


      let drop = _jquery.default.Event('drop', {
        dataTransfer: {
          files: [(0, _fileUpload.createFile)(['test'], {
            name: 'test.csv'
          })]
        }
      });

      this.set('uploadSuccess', uploadSuccess);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "WKe7SlaJ",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\",\"uploadSuccess\"],[[25,[\"uploadUrl\"]],[29,\"action\",[[24,0,[]],[25,[\"uploadSuccess\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      Ember.run(() => {
        this.$('.gh-image-uploader').trigger(drop);
      });
      await (0, _testHelpers.settled)();
      (0, _chai.expect)(uploadSuccess.calledOnce).to.be.true;
      (0, _chai.expect)(uploadSuccess.firstCall.args[0]).to.eql({
        url: '/content/images/test.png'
      });
    });
    (0, _mocha.it)('validates extension by default', async function () {
      let uploadSuccess = _sinon.default.spy();

      let uploadFailed = _sinon.default.spy();

      this.set('uploadSuccess', uploadSuccess);
      this.set('uploadFailed', uploadFailed);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "LuQ0xPl/",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\",\"uploadSuccess\",\"uploadFailed\"],[[25,[\"uploadUrl\"]],[29,\"action\",[[24,0,[]],[25,[\"uploadSuccess\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"uploadFailed\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.txt'
      });
      (0, _chai.expect)(uploadSuccess.called).to.be.false;
      (0, _chai.expect)(uploadFailed.calledOnce).to.be.true;
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The file type you uploaded is not supported/);
    });
    (0, _mocha.it)('uploads if validate action supplied and returns true', async function () {
      let validate = _sinon.default.stub().returns(true);

      let uploadSuccess = _sinon.default.spy();

      this.set('validate', validate);
      this.set('uploadSuccess', uploadSuccess);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "+NJMMXop",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\",\"uploadSuccess\",\"validate\"],[[25,[\"uploadUrl\"]],[29,\"action\",[[24,0,[]],[25,[\"uploadSuccess\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"validate\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      await (0, _testHelpers.settled)();
      (0, _chai.expect)(validate.calledOnce).to.be.true;
      (0, _chai.expect)(uploadSuccess.calledOnce).to.be.true;
    });
    (0, _mocha.it)('skips upload and displays error if validate action supplied and doesn\'t return true', async function () {
      let validate = _sinon.default.stub().returns(new _ajax.UnsupportedMediaTypeError());

      let uploadSuccess = _sinon.default.spy();

      let uploadFailed = _sinon.default.spy();

      this.set('validate', validate);
      this.set('uploadSuccess', uploadSuccess);
      this.set('uploadFailed', uploadFailed);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "NcmdBKZZ",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-file-uploader\",null,[[\"url\",\"uploadSuccess\",\"uploadFailed\",\"validate\"],[[25,[\"uploadUrl\"]],[29,\"action\",[[24,0,[]],[25,[\"uploadSuccess\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"uploadFailed\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"validate\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)(validate.calledOnce).to.be.true;
      (0, _chai.expect)(uploadSuccess.called).to.be.false;
      (0, _chai.expect)(uploadFailed.calledOnce).to.be.true;
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The file type you uploaded is not supported/);
    });
  });
});
define("ghost-admin/tests/integration/components/gh-image-uploader-test", ["jquery", "pretender", "sinon", "ghost-admin/services/ajax", "@ember/test-helpers", "ghost-admin/tests/helpers/file-upload", "mocha", "chai", "ember-mocha"], function (_jquery, _pretender, _sinon, _ajax, _testHelpers, _fileUpload, _mocha, _chai, _emberMocha) {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  const notificationsStub = Ember.Service.extend({
    showAPIError()
    /* error, options */
    {// noop - to be stubbed
    }

  });
  const sessionStub = Ember.Service.extend({
    isAuthenticated: false,

    init() {
      this._super(...arguments);

      let authenticated = {
        access_token: 'AccessMe123'
      };
      this.authenticated = authenticated;
      this.data = {
        authenticated
      };
    }

  });

  const stubSuccessfulUpload = function stubSuccessfulUpload(server) {
    let delay = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    server.post('/ghost/api/v2/admin/images/upload/', function () {
      return [200, {
        'Content-Type': 'application/json'
      }, '{"images": [{"url":"/content/images/test.png"}]}'];
    }, delay);
  };

  const stubFailedUpload = function stubFailedUpload(server, code, error) {
    let delay = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    server.post('/ghost/api/v2/admin/images/upload/', function () {
      return [code, {
        'Content-Type': 'application/json'
      }, JSON.stringify({
        errors: [{
          type: error,
          message: "Error: ".concat(error)
        }]
      })];
    }, delay);
  };

  (0, _mocha.describe)('Integration: Component: gh-image-uploader', function () {
    (0, _emberMocha.setupRenderingTest)();
    let server;
    beforeEach(function () {
      this.owner.register('service:session', sessionStub);
      this.owner.register('service:notifications', notificationsStub);
      this.set('update', function () {});
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('renders', async function () {
      this.set('image', 'http://example.com/test.png');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "97ipQIVo",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\"],[[25,[\"image\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)(this.$()).to.have.length(1);
    });
    (0, _mocha.it)('renders form with supplied alt text', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "9IMYuFjy",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"altText\"],[[25,[\"image\"]],\"text test\"]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-file-input-description]')).to.have.trimmed.text('Upload image of "text test"');
    });
    (0, _mocha.it)('renders form with supplied text', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "kDKylQC1",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"text\"],[[25,[\"image\"]],\"text test\"]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-file-input-description]')).to.have.trimmed.text('text test');
    });
    (0, _mocha.it)('generates request to correct endpoint', async function () {
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "lZeMtmXX",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"update\"],[[25,[\"image\"]],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(server.handledRequests.length).to.equal(1);
      (0, _chai.expect)(server.handledRequests[0].url).to.equal('/ghost/api/v2/admin/images/upload/');
      (0, _chai.expect)(server.handledRequests[0].requestHeaders.Authorization).to.be.undefined;
    });
    (0, _mocha.it)('fires update action on successful upload', async function () {
      let update = _sinon.default.spy();

      this.set('update', update);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "lZeMtmXX",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"update\"],[[25,[\"image\"]],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(update.calledOnce).to.be.true;
      (0, _chai.expect)(update.firstCall.args[0]).to.equal('/content/images/test.png');
    });
    (0, _mocha.it)('doesn\'t fire update action on failed upload', async function () {
      let update = _sinon.default.spy();

      this.set('update', update);
      stubFailedUpload(server, 500);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "lZeMtmXX",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"update\"],[[25,[\"image\"]],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(update.calledOnce).to.be.false;
    });
    (0, _mocha.it)('fires fileSelected action on file selection', async function () {
      let fileSelected = _sinon.default.spy();

      this.set('fileSelected', fileSelected);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "QLrE6lJh",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"fileSelected\",\"update\"],[[25,[\"image\"]],[29,\"action\",[[24,0,[]],[25,[\"fileSelected\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(fileSelected.calledOnce).to.be.true;
      (0, _chai.expect)(fileSelected.args[0]).to.not.be.empty;
    });
    (0, _mocha.it)('fires uploadStarted action on upload start', async function () {
      let uploadStarted = _sinon.default.spy();

      this.set('uploadStarted', uploadStarted);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "2jBZQPLh",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"uploadStarted\",\"update\"],[[25,[\"image\"]],[29,\"action\",[[24,0,[]],[25,[\"uploadStarted\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(uploadStarted.calledOnce).to.be.true;
    });
    (0, _mocha.it)('fires uploadFinished action on successful upload', async function () {
      let uploadFinished = _sinon.default.spy();

      this.set('uploadFinished', uploadFinished);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Dfz2ks5N",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"uploadFinished\",\"update\"],[[25,[\"image\"]],[29,\"action\",[[24,0,[]],[25,[\"uploadFinished\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(uploadFinished.calledOnce).to.be.true;
    });
    (0, _mocha.it)('fires uploadFinished action on failed upload', async function () {
      let uploadFinished = _sinon.default.spy();

      this.set('uploadFinished', uploadFinished);
      stubFailedUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Dfz2ks5N",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"uploadFinished\",\"update\"],[[25,[\"image\"]],[29,\"action\",[[24,0,[]],[25,[\"uploadFinished\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(uploadFinished.calledOnce).to.be.true;
    });
    (0, _mocha.it)('displays invalid file type error', async function () {
      stubFailedUpload(server, 415, 'UnsupportedMediaTypeError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "lZeMtmXX",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"update\"],[[25,[\"image\"]],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The image type you uploaded is not supported/);
      (0, _chai.expect)((0, _testHelpers.findAll)('.gh-btn-green').length, 'reset button is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.gh-btn-green').textContent).to.equal('Try Again');
    });
    (0, _mocha.it)('displays file too large for server error', async function () {
      stubFailedUpload(server, 413, 'RequestEntityTooLargeError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "lZeMtmXX",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"update\"],[[25,[\"image\"]],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The image you uploaded was larger/);
    });
    (0, _mocha.it)('handles file too large error directly from the web server', async function () {
      server.post('/ghost/api/v2/admin/images/upload/', function () {
        return [413, {}, ''];
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "lZeMtmXX",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"update\"],[[25,[\"image\"]],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The image you uploaded was larger/);
    });
    (0, _mocha.it)('displays other server-side error with message', async function () {
      stubFailedUpload(server, 400, 'UnknownError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "lZeMtmXX",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"update\"],[[25,[\"image\"]],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/Error: UnknownError/);
    });
    (0, _mocha.it)('handles unknown failure', async function () {
      server.post('/ghost/api/v2/admin/images/upload/', function () {
        return [500, {
          'Content-Type': 'application/json'
        }, ''];
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "lZeMtmXX",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"update\"],[[25,[\"image\"]],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/Something went wrong/);
    });
    (0, _mocha.it)('triggers notifications.showAPIError for VersionMismatchError', async function () {
      let showAPIError = _sinon.default.spy();

      let notifications = this.owner.lookup('service:notifications');
      notifications.set('showAPIError', showAPIError);
      stubFailedUpload(server, 400, 'VersionMismatchError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "lZeMtmXX",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"update\"],[[25,[\"image\"]],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(showAPIError.calledOnce).to.be.true;
    });
    (0, _mocha.it)('doesn\'t trigger notifications.showAPIError for other errors', async function () {
      let showAPIError = _sinon.default.spy();

      let notifications = this.owner.lookup('service:notifications');
      notifications.set('showAPIError', showAPIError);
      stubFailedUpload(server, 400, 'UnknownError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "lZeMtmXX",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"update\"],[[25,[\"image\"]],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(showAPIError.called).to.be.false;
    });
    (0, _mocha.it)('can be reset after a failed upload', async function () {
      stubFailedUpload(server, 400, 'UnknownError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "lZeMtmXX",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"update\"],[[25,[\"image\"]],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        type: 'test.png'
      });
      await (0, _testHelpers.click)('.gh-btn-green');
      (0, _chai.expect)((0, _testHelpers.findAll)('input[type="file"]').length).to.equal(1);
    });
    (0, _mocha.it)('displays upload progress', async function () {
      // pretender fires a progress event every 50ms
      stubSuccessfulUpload(server, 150);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "lZeMtmXX",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"update\"],[[25,[\"image\"]],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      await (0, _testHelpers.waitFor)('.progress .bar');
      let progressBar = (0, _testHelpers.find)('.progress .bar');
      await (0, _testHelpers.waitUntil)(function () {
        let _progressBar$getAttri = progressBar.getAttribute('style').match(/width: (\d+)%?/),
            _progressBar$getAttri2 = _slicedToArray(_progressBar$getAttri, 2),
            percentageWidth = _progressBar$getAttri2[1];

        percentageWidth = Number.parseInt(percentageWidth);
        return percentageWidth > 0;
      }, {
        timeout: 150
      });
      await (0, _testHelpers.settled)();
    });
    (0, _mocha.it)('handles drag over/leave', async function () {
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "lZeMtmXX",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"image\",\"update\"],[[25,[\"image\"]],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      Ember.run(() => {
        // eslint-disable-next-line new-cap
        let dragover = _jquery.default.Event('dragover', {
          dataTransfer: {
            files: []
          }
        });

        this.$('.gh-image-uploader').trigger(dragover);
      });
      await (0, _testHelpers.settled)();
      (0, _chai.expect)((0, _testHelpers.find)('.gh-image-uploader').classList.contains('-drag-over'), 'has drag-over class').to.be.true;
      await (0, _testHelpers.triggerEvent)('.gh-image-uploader', 'dragleave');
      (0, _chai.expect)((0, _testHelpers.find)('.gh-image-uploader').classList.contains('-drag-over'), 'has drag-over class').to.be.false;
    });
    (0, _mocha.it)('triggers file upload on file drop', async function () {
      let uploadSuccess = _sinon.default.spy(); // eslint-disable-next-line new-cap


      let drop = _jquery.default.Event('drop', {
        dataTransfer: {
          files: [(0, _fileUpload.createFile)(['test'], {
            name: 'test.png'
          })]
        }
      });

      this.set('uploadSuccess', uploadSuccess);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "ZZpzvEK6",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"uploadSuccess\"],[[29,\"action\",[[24,0,[]],[25,[\"uploadSuccess\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      Ember.run(() => {
        this.$('.gh-image-uploader').trigger(drop);
      });
      await (0, _testHelpers.settled)();
      (0, _chai.expect)(uploadSuccess.calledOnce).to.be.true;
      (0, _chai.expect)(uploadSuccess.firstCall.args[0]).to.equal('/content/images/test.png');
    });
    (0, _mocha.it)('validates extension by default', async function () {
      let uploadSuccess = _sinon.default.spy();

      let uploadFailed = _sinon.default.spy();

      this.set('uploadSuccess', uploadSuccess);
      this.set('uploadFailed', uploadFailed);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Smin+wvy",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"uploadSuccess\",\"uploadFailed\"],[[29,\"action\",[[24,0,[]],[25,[\"uploadSuccess\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"uploadFailed\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.json'
      });
      (0, _chai.expect)(uploadSuccess.called).to.be.false;
      (0, _chai.expect)(uploadFailed.calledOnce).to.be.true;
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The image type you uploaded is not supported/);
    });
    (0, _mocha.it)('uploads if validate action supplied and returns true', async function () {
      let validate = _sinon.default.stub().returns(true);

      let uploadSuccess = _sinon.default.spy();

      this.set('validate', validate);
      this.set('uploadSuccess', uploadSuccess);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Z/6y+e4w",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"uploadSuccess\",\"validate\"],[[29,\"action\",[[24,0,[]],[25,[\"uploadSuccess\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"validate\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.txt'
      });
      (0, _chai.expect)(validate.calledOnce).to.be.true;
      (0, _chai.expect)(uploadSuccess.calledOnce).to.be.true;
    });
    (0, _mocha.it)('skips upload and displays error if validate action supplied and doesn\'t return true', async function () {
      let validate = _sinon.default.stub().returns(new _ajax.UnsupportedMediaTypeError());

      let uploadSuccess = _sinon.default.spy();

      let uploadFailed = _sinon.default.spy();

      this.set('validate', validate);
      this.set('uploadSuccess', uploadSuccess);
      this.set('uploadFailed', uploadFailed);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "VZiKio6k",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader\",null,[[\"uploadSuccess\",\"uploadFailed\",\"validate\"],[[29,\"action\",[[24,0,[]],[25,[\"uploadSuccess\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"uploadFailed\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"validate\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(validate.calledOnce).to.be.true;
      (0, _chai.expect)(uploadSuccess.called).to.be.false;
      (0, _chai.expect)(uploadFailed.calledOnce).to.be.true;
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The image type you uploaded is not supported/);
    });
    (0, _mocha.describe)('unsplash', function () {
      (0, _mocha.it)('has unsplash icon only when unsplash is active & allowed');
      (0, _mocha.it)('opens unsplash modal when icon clicked');
      (0, _mocha.it)('inserts unsplash image when selected');
      (0, _mocha.it)('closes unsplash modal when close is triggered');
    });
  });
});
define("ghost-admin/tests/integration/components/gh-image-uploader-with-preview-test", ["sinon", "@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_sinon, _testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-image-uploader-with-preview', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders image if provided', async function () {
      this.set('image', 'http://example.com/test.png');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "fVWs7Xs+",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader-with-preview\",null,[[\"image\"],[[25,[\"image\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.findAll)('.gh-image-uploader.-with-image').length).to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('img').getAttribute('src')).to.equal('http://example.com/test.png');
    });
    (0, _mocha.it)('renders upload form when no image provided', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "fVWs7Xs+",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader-with-preview\",null,[[\"image\"],[[25,[\"image\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.findAll)('input[type="file"]').length).to.equal(1);
    });
    (0, _mocha.it)('triggers remove action when delete icon is clicked', async function () {
      let remove = _sinon.default.spy();

      this.set('remove', remove);
      this.set('image', 'http://example.com/test.png');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "QiknHRmG",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-image-uploader-with-preview\",null,[[\"image\",\"remove\"],[[25,[\"image\"]],[29,\"action\",[[24,0,[]],[25,[\"remove\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.click)('.image-cancel');
      (0, _chai.expect)(remove.calledOnce).to.be.true;
    });
  });
});
define("ghost-admin/tests/integration/components/gh-member-avatar-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-member-avatar', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders', async function () {
      this.set('member', {
        name: 'Homer Simpson'
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "ybGA89I7",
        "block": "{\"symbols\":[],\"statements\":[[5,\"gh-member-avatar\",[],[[\"@member\"],[[23,\"member\"]]]]],\"hasEval\":false}",
        "meta": {}
      }));
      let avatar = this.element;
      (0, _chai.expect)(avatar).to.exist;
    });
  });
});
define("ghost-admin/tests/integration/components/gh-navitem-test", ["ghost-admin/models/navigation-item", "@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_navigationItem, _testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-navitem', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      this.set('baseUrl', 'http://localhost:2368');
    });
    (0, _mocha.it)('renders', async function () {
      this.set('navItem', _navigationItem.default.create({
        label: 'Test',
        url: '/url'
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "XqhuwfiQ",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-navitem\",null,[[\"navItem\",\"baseUrl\"],[[25,[\"navItem\"]],[25,[\"baseUrl\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      let $item = this.$('.gh-blognav-item');
      (0, _chai.expect)($item.find('.gh-blognav-grab').length).to.equal(1);
      (0, _chai.expect)($item.find('.gh-blognav-label').length).to.equal(1);
      (0, _chai.expect)($item.find('.gh-blognav-url').length).to.equal(1);
      (0, _chai.expect)($item.find('.gh-blognav-delete').length).to.equal(1); // doesn't show any errors

      (0, _chai.expect)($item.hasClass('gh-blognav-item--error')).to.be.false;
      (0, _chai.expect)($item.find('.error').length).to.equal(0);
      (0, _chai.expect)($item.find('.response:visible').length).to.equal(0);
    });
    (0, _mocha.it)('doesn\'t show drag handle for new items', async function () {
      this.set('navItem', _navigationItem.default.create({
        label: 'Test',
        url: '/url',
        isNew: true
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "XqhuwfiQ",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-navitem\",null,[[\"navItem\",\"baseUrl\"],[[25,[\"navItem\"]],[25,[\"baseUrl\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      let $item = this.$('.gh-blognav-item');
      (0, _chai.expect)($item.find('.gh-blognav-grab').length).to.equal(0);
    });
    (0, _mocha.it)('shows add button for new items', async function () {
      this.set('navItem', _navigationItem.default.create({
        label: 'Test',
        url: '/url',
        isNew: true
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "XqhuwfiQ",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-navitem\",null,[[\"navItem\",\"baseUrl\"],[[25,[\"navItem\"]],[25,[\"baseUrl\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      let $item = this.$('.gh-blognav-item');
      (0, _chai.expect)($item.find('.gh-blognav-add').length).to.equal(1);
      (0, _chai.expect)($item.find('.gh-blognav-delete').length).to.equal(0);
    });
    (0, _mocha.it)('triggers delete action', async function () {
      this.set('navItem', _navigationItem.default.create({
        label: 'Test',
        url: '/url'
      }));
      let deleteActionCallCount = 0;
      this.set('deleteItem', navItem => {
        (0, _chai.expect)(navItem).to.equal(this.get('navItem'));
        deleteActionCallCount += 1;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "blzQg3yu",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-navitem\",null,[[\"navItem\",\"baseUrl\",\"deleteItem\"],[[25,[\"navItem\"]],[25,[\"baseUrl\"]],[29,\"action\",[[24,0,[]],[25,[\"deleteItem\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.click)('.gh-blognav-delete');
      (0, _chai.expect)(deleteActionCallCount).to.equal(1);
    });
    (0, _mocha.it)('triggers add action', async function () {
      this.set('navItem', _navigationItem.default.create({
        label: 'Test',
        url: '/url',
        isNew: true
      }));
      let addActionCallCount = 0;
      this.set('add', () => {
        addActionCallCount += 1;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "XVQfoo85",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-navitem\",null,[[\"navItem\",\"baseUrl\",\"addItem\"],[[25,[\"navItem\"]],[25,[\"baseUrl\"]],[29,\"action\",[[24,0,[]],[25,[\"add\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.click)('.gh-blognav-add');
      (0, _chai.expect)(addActionCallCount).to.equal(1);
    });
    (0, _mocha.it)('triggers update url action', async function () {
      this.set('navItem', _navigationItem.default.create({
        label: 'Test',
        url: '/url'
      }));
      let updateActionCallCount = 0;
      this.set('update', value => {
        updateActionCallCount += 1;
        return value;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "yGWgFQgy",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-navitem\",null,[[\"navItem\",\"baseUrl\",\"updateUrl\"],[[25,[\"navItem\"]],[25,[\"baseUrl\"]],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.triggerEvent)('.gh-blognav-url input', 'blur');
      (0, _chai.expect)(updateActionCallCount).to.equal(1);
    });
    (0, _mocha.it)('triggers update label action', async function () {
      this.set('navItem', _navigationItem.default.create({
        label: 'Test',
        url: '/url'
      }));
      let updateActionCallCount = 0;
      this.set('update', value => {
        updateActionCallCount += 1;
        return value;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "iznXaJRI",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-navitem\",null,[[\"navItem\",\"baseUrl\",\"updateLabel\"],[[25,[\"navItem\"]],[25,[\"baseUrl\"]],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.triggerEvent)('.gh-blognav-label input', 'blur');
      (0, _chai.expect)(updateActionCallCount).to.equal(1);
    });
    (0, _mocha.it)('displays inline errors', async function () {
      this.set('navItem', _navigationItem.default.create({
        label: '',
        url: ''
      }));
      this.get('navItem').validate();
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "XqhuwfiQ",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-navitem\",null,[[\"navItem\",\"baseUrl\"],[[25,[\"navItem\"]],[25,[\"baseUrl\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      let $item = this.$('.gh-blognav-item');
      (0, _chai.expect)($item.hasClass('gh-blognav-item--error')).to.be.true;
      (0, _chai.expect)($item.find('.gh-blognav-label').hasClass('error')).to.be.true;
      (0, _chai.expect)($item.find('.gh-blognav-label .response').text().trim()).to.equal('You must specify a label');
      (0, _chai.expect)($item.find('.gh-blognav-url').hasClass('error')).to.be.true;
      (0, _chai.expect)($item.find('.gh-blognav-url .response').text().trim()).to.equal('You must specify a URL or relative path');
    });
  });
});
define("ghost-admin/tests/integration/components/gh-navitem-url-input-test", ["@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  // we want baseUrl to match the running domain so relative URLs are
  // handled as expected (browser auto-sets the domain when using a.href)
  let currentUrl = "".concat(window.location.protocol, "//").concat(window.location.host, "/");
  (0, _mocha.describe)('Integration: Component: gh-navitem-url-input', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      // set defaults
      this.set('baseUrl', currentUrl);
      this.set('url', '');
      this.set('isNew', false);
      this.set('clearErrors', function () {
        return null;
      });
    });
    (0, _mocha.it)('renders correctly with blank url', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "fvbjAzy9",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.findAll)('input')).to.have.length(1);
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.class('gh-input');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value(currentUrl);
    });
    (0, _mocha.it)('renders correctly with relative urls', async function () {
      this.set('url', '/about');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "fvbjAzy9",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value("".concat(currentUrl, "about"));
      this.set('url', '/about#contact');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value("".concat(currentUrl, "about#contact"));
    });
    (0, _mocha.it)('renders correctly with absolute urls', async function () {
      this.set('url', 'https://example.com:2368/#test');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "fvbjAzy9",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('https://example.com:2368/#test');
      this.set('url', 'mailto:test@example.com');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('mailto:test@example.com');
      this.set('url', 'tel:01234-5678-90');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('tel:01234-5678-90');
      this.set('url', '//protocol-less-url.com');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('//protocol-less-url.com');
      this.set('url', '#anchor');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('#anchor');
    });
    (0, _mocha.it)('deletes base URL on backspace', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "fvbjAzy9",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value(currentUrl);
      await (0, _testHelpers.triggerKeyEvent)('input', 'keydown', 8);
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('');
    });
    (0, _mocha.it)('deletes base URL on delete', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "fvbjAzy9",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value(currentUrl);
      await (0, _testHelpers.triggerKeyEvent)('input', 'keydown', 46);
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('');
    });
    (0, _mocha.it)('adds base url to relative urls on blur', async function () {
      this.set('updateUrl', val => val);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "WYsJKSIp",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"updateUrl\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.fillIn)('input', '/about');
      await (0, _testHelpers.blur)('input');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value("".concat(currentUrl, "about/"));
    });
    (0, _mocha.it)('adds "mailto:" to email addresses on blur', async function () {
      this.set('updateUrl', val => val);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "WYsJKSIp",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"updateUrl\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.fillIn)('input', 'test@example.com');
      await (0, _testHelpers.blur)('input');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('mailto:test@example.com'); // ensure we don't double-up on the mailto:

      await (0, _testHelpers.blur)('input');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('mailto:test@example.com');
    });
    (0, _mocha.it)('doesn\'t add base url to invalid urls on blur', async function () {
      this.set('updateUrl', val => val);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "WYsJKSIp",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"updateUrl\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));

      let changeValue = async value => {
        await (0, _testHelpers.fillIn)('input', value);
        await (0, _testHelpers.blur)('input');
      };

      await changeValue('with spaces');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('with spaces');
      await changeValue('/with spaces');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('/with spaces');
    });
    (0, _mocha.it)('doesn\'t mangle invalid urls on blur', async function () {
      this.set('updateUrl', val => val);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "WYsJKSIp",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"updateUrl\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.fillIn)('input', "".concat(currentUrl, " /test"));
      await (0, _testHelpers.blur)('input');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value("".concat(currentUrl, " /test"));
    }); // https://github.com/TryGhost/Ghost/issues/9373

    (0, _mocha.it)('doesn\'t mangle urls when baseUrl has unicode characters', async function () {
      this.set('updateUrl', val => val);
      this.set('baseUrl', 'http://exämple.com');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "WYsJKSIp",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"updateUrl\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.fillIn)('input', "".concat(currentUrl, "/test"));
      await (0, _testHelpers.blur)('input');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value("".concat(currentUrl, "/test"));
    });
    (0, _mocha.it)('triggers "update" action on blur', async function () {
      let changeActionCallCount = 0;
      this.set('updateUrl', val => {
        changeActionCallCount += 1;
        return val;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "WYsJKSIp",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"updateUrl\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.click)('input');
      await (0, _testHelpers.blur)('input');
      (0, _chai.expect)(changeActionCallCount).to.equal(1);
    });
    (0, _mocha.it)('triggers "update" action on enter', async function () {
      let changeActionCallCount = 0;
      this.set('updateUrl', val => {
        changeActionCallCount += 1;
        return val;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "WYsJKSIp",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"updateUrl\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.triggerKeyEvent)('input', 'keypress', 13);
      (0, _chai.expect)(changeActionCallCount).to.equal(1);
    });
    (0, _mocha.it)('triggers "update" action on CMD-S', async function () {
      let changeActionCallCount = 0;
      this.set('updateUrl', val => {
        changeActionCallCount += 1;
        return val;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "WYsJKSIp",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"updateUrl\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.triggerKeyEvent)('input', 'keydown', 83, {
        metaKey: true
      });
      (0, _chai.expect)(changeActionCallCount).to.equal(1);
    });
    (0, _mocha.it)('sends absolute urls straight through to update action', async function () {
      let lastSeenUrl = '';
      this.set('updateUrl', url => {
        lastSeenUrl = url;
        return url;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "WYsJKSIp",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"updateUrl\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));

      let testUrl = async url => {
        await (0, _testHelpers.fillIn)('input', url);
        await (0, _testHelpers.blur)('input');
        (0, _chai.expect)(lastSeenUrl).to.equal(url);
      };

      await testUrl('http://example.com');
      await testUrl('http://example.com/');
      await testUrl('https://example.com');
      await testUrl('//example.com');
      await testUrl('//localhost:1234');
      await testUrl('#anchor');
      await testUrl('mailto:test@example.com');
      await testUrl('tel:12345-567890');
      await testUrl('javascript:alert("testing");');
    });
    (0, _mocha.it)('strips base url from relative urls before sending to update action', async function () {
      let lastSeenUrl = '';
      this.set('updateUrl', url => {
        lastSeenUrl = url;
        return url;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "WYsJKSIp",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"updateUrl\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));

      let testUrl = async url => {
        await (0, _testHelpers.fillIn)('input', "".concat(currentUrl).concat(url));
        await (0, _testHelpers.blur)('input');
        (0, _chai.expect)(lastSeenUrl).to.equal("/".concat(url));
      };

      await testUrl('about/');
      await testUrl('about#contact');
      await testUrl('test/nested/');
    });
    (0, _mocha.it)('handles links to subdomains of blog domain', async function () {
      let expectedUrl = '';
      this.set('baseUrl', 'http://example.com/');
      this.set('updateUrl', url => {
        (0, _chai.expect)(url).to.equal(expectedUrl);
        return url;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "WYsJKSIp",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"updateUrl\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      expectedUrl = 'http://test.example.com/';
      await (0, _testHelpers.fillIn)('input', expectedUrl);
      await (0, _testHelpers.blur)('input');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value(expectedUrl);
    });
    (0, _mocha.it)('adds trailing slash to relative URL', async function () {
      let lastSeenUrl = '';
      this.set('updateUrl', url => {
        lastSeenUrl = url;
        return url;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "WYsJKSIp",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"updateUrl\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));

      let testUrl = async url => {
        await (0, _testHelpers.fillIn)('input', "".concat(currentUrl).concat(url));
        await (0, _testHelpers.blur)('input');
        (0, _chai.expect)(lastSeenUrl).to.equal("/".concat(url, "/"));
      };

      await testUrl('about');
      await testUrl('test/nested');
    });
    (0, _mocha.it)('does not add trailing slash on relative URL with [.?#]', async function () {
      let lastSeenUrl = '';
      this.set('updateUrl', url => {
        lastSeenUrl = url;
        return url;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "WYsJKSIp",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"updateUrl\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));

      let testUrl = async url => {
        await (0, _testHelpers.fillIn)('input', "".concat(currentUrl).concat(url));
        await (0, _testHelpers.blur)('input');
        (0, _chai.expect)(lastSeenUrl).to.equal("/".concat(url));
      };

      await testUrl('about#contact');
      await testUrl('test/nested.svg');
      await testUrl('test?gho=sties');
      await testUrl('test/nested?sli=mer');
    });
    (0, _mocha.it)('does not add trailing slash on non-relative URLs', async function () {
      let lastSeenUrl = '';
      this.set('updateUrl', url => {
        lastSeenUrl = url;
        return url;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "WYsJKSIp",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"updateUrl\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));

      let testUrl = async url => {
        await (0, _testHelpers.fillIn)('input', url);
        await (0, _testHelpers.blur)('input');
        (0, _chai.expect)(lastSeenUrl).to.equal(url);
      };

      await testUrl('http://woo.ff/test');
      await testUrl('http://me.ow:2342/nested/test');
      await testUrl('https://wro.om/car#race');
      await testUrl('https://kabo.om/explosion?really=now');
    });
    (0, _mocha.describe)('with sub-folder baseUrl', function () {
      beforeEach(function () {
        this.set('baseUrl', "".concat(currentUrl, "blog/"));
      });
      (0, _mocha.it)('handles URLs relative to base url', async function () {
        let lastSeenUrl = '';
        this.set('updateUrl', url => {
          lastSeenUrl = url;
          return url;
        });
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "zPtio8nM",
          "block": "{\"symbols\":[],\"statements\":[[0,\"\\n                \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"updateUrl\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n            \"]],\"hasEval\":false}",
          "meta": {}
        }));

        let testUrl = async url => {
          await (0, _testHelpers.fillIn)('input', "".concat(currentUrl, "blog").concat(url));
          await (0, _testHelpers.blur)('input');
          (0, _chai.expect)(lastSeenUrl).to.equal(url);
        };

        await testUrl('/about/');
        await testUrl('/about#contact');
        await testUrl('/test/nested/');
      });
      (0, _mocha.it)('handles URLs relative to base host', async function () {
        let lastSeenUrl = '';
        this.set('updateUrl', url => {
          lastSeenUrl = url;
          return url;
        });
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "zPtio8nM",
          "block": "{\"symbols\":[],\"statements\":[[0,\"\\n                \"],[1,[29,\"gh-navitem-url-input\",null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[25,[\"baseUrl\"]],[25,[\"url\"]],[25,[\"isNew\"]],[29,\"action\",[[24,0,[]],[25,[\"updateUrl\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"clearErrors\"]]],null]]]],false],[0,\"\\n            \"]],\"hasEval\":false}",
          "meta": {}
        }));

        let testUrl = async url => {
          await (0, _testHelpers.fillIn)('input', url);
          await (0, _testHelpers.blur)('input');
          (0, _chai.expect)(lastSeenUrl).to.equal(url);
        };

        await testUrl("http://".concat(window.location.host));
        await testUrl("https://".concat(window.location.host));
        await testUrl("http://".concat(window.location.host, "/"));
        await testUrl("https://".concat(window.location.host, "/"));
        await testUrl("http://".concat(window.location.host, "/test"));
        await testUrl("https://".concat(window.location.host, "/test"));
        await testUrl("http://".concat(window.location.host, "/#test"));
        await testUrl("https://".concat(window.location.host, "/#test"));
        await testUrl("http://".concat(window.location.host, "/another/folder"));
        await testUrl("https://".concat(window.location.host, "/another/folder"));
      });
    });
  });
});
define("ghost-admin/tests/integration/components/gh-notification-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-notification', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders', async function () {
      this.set('message', {
        message: 'Test message',
        type: 'success'
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "HE/IHGJo",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-notification\",null,[[\"message\"],[[25,[\"message\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('article.gh-notification')).to.exist;
      let notification = (0, _testHelpers.find)('.gh-notification');
      (0, _chai.expect)(notification).to.have.class('gh-notification-passive');
      (0, _chai.expect)(notification).to.contain.text('Test message');
    });
    (0, _mocha.it)('maps message types to CSS classes', async function () {
      this.set('message', {
        message: 'Test message',
        type: 'success'
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "HE/IHGJo",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-notification\",null,[[\"message\"],[[25,[\"message\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      let notification = (0, _testHelpers.find)('.gh-notification');
      this.set('message.type', 'success');
      (0, _chai.expect)(notification, 'success class is green').to.have.class('gh-notification-green');
      this.set('message.type', 'error');
      (0, _chai.expect)(notification, 'success class is red').to.have.class('gh-notification-red');
      this.set('message.type', 'warn');
      (0, _chai.expect)(notification, 'success class is yellow').to.have.class('gh-notification-yellow');
    });
  });
});
define("ghost-admin/tests/integration/components/gh-notifications-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  let notificationsStub = Ember.Service.extend({
    notifications: Ember.A()
  });
  (0, _mocha.describe)('Integration: Component: gh-notifications', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      this.owner.register('service:notifications', notificationsStub);
      let notifications = this.owner.lookup('service:notifications');
      notifications.set('notifications', [{
        message: 'First',
        type: 'error'
      }, {
        message: 'Second',
        type: 'warn'
      }]);
    });
    (0, _mocha.it)('renders', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "MUtBzq8S",
        "block": "{\"symbols\":[],\"statements\":[[1,[23,\"gh-notifications\"],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.gh-notifications')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('.gh-notifications').children.length).to.equal(2);
      let notifications = this.owner.lookup('service:notifications');
      notifications.set('notifications', Ember.A());
      await (0, _testHelpers.settled)();
      (0, _chai.expect)((0, _testHelpers.find)('.gh-notifications').children.length).to.equal(0);
    });
  });
});
define("ghost-admin/tests/integration/components/gh-profile-image-test", ["pretender", "blueimp-md5", "mocha", "chai", "@ember/test-helpers", "ember-mocha", "ember-concurrency"], function (_pretender, _blueimpMd, _mocha, _chai, _testHelpers, _emberMocha, _emberConcurrency) {
  "use strict";

  let pathsStub = Ember.Service.extend({
    assetRoot: '/ghost/assets/',

    init() {
      this._super(...arguments);

      this.url = {
        api() {
          return '';
        },

        asset(src) {
          return src;
        }

      };
    }

  });

  const stubKnownGravatar = function stubKnownGravatar(server) {
    server.get('http://www.gravatar.com/avatar/:md5', function () {
      return [200, {
        'Content-Type': 'image/png'
      }, ''];
    });
    server.head('http://www.gravatar.com/avatar/:md5', function () {
      return [200, {
        'Content-Type': 'image/png'
      }, ''];
    });
  };

  const stubUnknownGravatar = function stubUnknownGravatar(server) {
    server.get('http://www.gravatar.com/avatar/:md5', function () {
      return [404, {}, ''];
    });
    server.head('http://www.gravatar.com/avatar/:md5', function () {
      return [404, {}, ''];
    });
  };

  let configStubuseGravatar = Ember.Service.extend({
    useGravatar: true
  });
  (0, _mocha.describe)('Integration: Component: gh-profile-image', function () {
    (0, _emberMocha.setupRenderingTest)();
    let server;
    beforeEach(function () {
      this.owner.register('service:ghost-paths', pathsStub);
      this.owner.register('service:config', configStubuseGravatar);
      server = new _pretender.default();
      stubKnownGravatar(server);
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('renders', async function () {
      this.set('email', '');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "mjNrZ0bZ",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-profile-image\",null,[[\"email\"],[[25,[\"email\"]]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.account-image')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('.placeholder-img')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('input[type="file"]')).to.exist;
    });
    (0, _mocha.it)('renders default image if no email supplied', async function () {
      this.set('email', null);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Xxi9SfzT",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-profile-image\",null,[[\"email\",\"size\",\"debounce\"],[[25,[\"email\"]],100,50]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.gravatar-img'), 'gravatar image style').to.have.attribute('style', 'display: none');
    });
    (0, _mocha.it)('renders the gravatar if valid email supplied and privacy.useGravatar allows it', async function () {
      let email = 'test@example.com';
      let expectedUrl = "//www.gravatar.com/avatar/".concat((0, _blueimpMd.default)(email), "?s=100&d=404");
      this.set('email', email);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Xxi9SfzT",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-profile-image\",null,[[\"email\",\"size\",\"debounce\"],[[25,[\"email\"]],100,50]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.gravatar-img'), 'gravatar image style').to.have.attribute('style', "background-image: url(".concat(expectedUrl, "); display: block"));
    });
    (0, _mocha.it)('doesn\'t render the gravatar if valid email supplied but privacy.useGravatar forbids it', async function () {
      let config = this.owner.lookup('service:config');
      let email = 'test@example.com';
      this.set('email', email);
      config.set('useGravatar', false);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Xxi9SfzT",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-profile-image\",null,[[\"email\",\"size\",\"debounce\"],[[25,[\"email\"]],100,50]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.gravatar-img'), 'gravatar image style').to.have.attribute('style', 'display: none');
    });
    (0, _mocha.it)('doesn\'t add background url if gravatar image doesn\'t exist', async function () {
      stubUnknownGravatar(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "fa9e/uc3",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-profile-image\",null,[[\"email\",\"size\",\"debounce\"],[\"test@example.com\",100,50]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.gravatar-img'), 'gravatar image style').to.have.attribute('style', 'background-image: url(); display: none');
    }); // skipped due to random failures on Travis - https://github.com/TryGhost/Ghost/issues/10308

    _mocha.it.skip('throttles gravatar loading as email is changed', async function () {
      let email = 'test@example.com';
      let expectedUrl = "//www.gravatar.com/avatar/".concat((0, _blueimpMd.default)(email), "?s=100&d=404");
      this.set('email', 'test');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "hTtPwzXZ",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-profile-image\",null,[[\"email\",\"size\",\"debounce\"],[[25,[\"email\"]],100,300]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      this.set('email', email);
      await (0, _emberConcurrency.timeout)(50);
      (0, _chai.expect)((0, _testHelpers.find)('.gravatar-img'), '.gravatar-img background not immediately changed on email change').to.have.attribute('style', 'display: none');
      await (0, _emberConcurrency.timeout)(250);
      (0, _chai.expect)((0, _testHelpers.find)('.gravatar-img'), '.gravatar-img background still not changed before debounce timeout').to.have.attribute('style', 'display: none');
      await (0, _emberConcurrency.timeout)(100);
      (0, _chai.expect)((0, _testHelpers.find)('.gravatar-img'), '.gravatar-img background changed after debounce timeout').to.have.attribute('style', "background-image: url(".concat(expectedUrl, "); display: block"));
    });
  });
});
define("ghost-admin/tests/integration/components/gh-psm-tags-input-test", ["ghost-admin/mirage/config/posts", "ghost-admin/mirage/config/themes", "@ember/test-helpers", "ember-power-select/test-support/helpers", "mocha", "chai", "ember-mocha", "ghost-admin/initializers/ember-cli-mirage", "ember-concurrency"], function (_posts, _themes, _testHelpers, _helpers, _mocha, _chai, _emberMocha, _emberCliMirage, _emberConcurrency) {
  "use strict";

  // NOTE: although Mirage has posts<->tags relationship and can respond
  // to :post-id/?include=tags all ordering information is lost so we
  // need to build the tags array manually
  const assignPostWithTags = async function postWithTags(context) {
    let post = await context.store.findRecord('post', 1);
    let tags = await context.store.findAll('tag');

    for (var _len = arguments.length, slugs = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      slugs[_key - 1] = arguments[_key];
    }

    slugs.forEach(slug => {
      post.get('tags').pushObject(tags.findBy('slug', slug));
    });
    context.set('post', post);
    await (0, _testHelpers.settled)();
  };

  (0, _mocha.describe)('Integration: Component: gh-psm-tags-input', function () {
    (0, _emberMocha.setupRenderingTest)();
    let server;
    beforeEach(function () {
      server = (0, _emberCliMirage.startMirage)();
      let author = server.create('user');
      (0, _posts.default)(server);
      (0, _themes.default)(server);
      server.create('post', {
        authors: [author]
      });
      server.create('tag', {
        name: 'Tag 1',
        slug: 'one'
      });
      server.create('tag', {
        name: '#Tag 2',
        visibility: 'internal',
        slug: 'two'
      });
      server.create('tag', {
        name: 'Tag 3',
        slug: 'three'
      });
      server.create('tag', {
        name: 'Tag 4',
        slug: 'four'
      });
      this.set('store', this.owner.lookup('service:store'));
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('shows selected tags on render', async function () {
      await assignPostWithTags(this, 'one', 'three');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "L4YiSdZI",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-psm-tags-input\",null,[[\"post\"],[[25,[\"post\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      let selected = (0, _testHelpers.findAll)('.tag-token');
      (0, _chai.expect)(selected.length).to.equal(2);
      (0, _chai.expect)(selected[0]).to.contain.text('Tag 1');
      (0, _chai.expect)(selected[1]).to.contain.text('Tag 3');
    });
    (0, _mocha.it)('exposes all tags as options sorted alphabetically', async function () {
      this.set('post', this.store.findRecord('post', 1));
      await (0, _testHelpers.settled)();
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "L4YiSdZI",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-psm-tags-input\",null,[[\"post\"],[[25,[\"post\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _helpers.clickTrigger)();
      await (0, _testHelpers.settled)(); // unsure why settled() is sometimes not catching the update

      await (0, _emberConcurrency.timeout)(100);
      let options = (0, _testHelpers.findAll)('.ember-power-select-option');
      (0, _chai.expect)(options.length).to.equal(4);
      (0, _chai.expect)(options[0]).to.contain.text('Tag 1');
      (0, _chai.expect)(options[1]).to.contain.text('#Tag 2');
      (0, _chai.expect)(options[2]).to.contain.text('Tag 3');
      (0, _chai.expect)(options[3]).to.contain.text('Tag 4');
    });
    (0, _mocha.it)('matches options on lowercase tag names', async function () {
      this.set('post', this.store.findRecord('post', 1));
      await (0, _testHelpers.settled)();
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "L4YiSdZI",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-psm-tags-input\",null,[[\"post\"],[[25,[\"post\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _helpers.clickTrigger)();
      await (0, _helpers.typeInSearch)('2');
      await (0, _testHelpers.settled)(); // unsure why settled() is sometimes not catching the update

      await (0, _emberConcurrency.timeout)(100);
      let options = (0, _testHelpers.findAll)('.ember-power-select-option');
      (0, _chai.expect)(options.length).to.equal(2);
      (0, _chai.expect)(options[0]).to.contain.text('Add "2"...');
      (0, _chai.expect)(options[1]).to.contain.text('Tag 2');
    });
    (0, _mocha.it)('hides create option on exact matches', async function () {
      this.set('post', this.store.findRecord('post', 1));
      await (0, _testHelpers.settled)();
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "L4YiSdZI",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-psm-tags-input\",null,[[\"post\"],[[25,[\"post\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _helpers.clickTrigger)();
      await (0, _helpers.typeInSearch)('#Tag 2');
      await (0, _testHelpers.settled)(); // unsure why settled() is sometimes not catching the update

      await (0, _emberConcurrency.timeout)(100);
      let options = (0, _testHelpers.findAll)('.ember-power-select-option');
      (0, _chai.expect)(options.length).to.equal(1);
      (0, _chai.expect)(options[0]).to.contain.text('#Tag 2');
    });
    (0, _mocha.it)('highlights internal tags', async function () {
      await assignPostWithTags(this, 'two', 'three');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "L4YiSdZI",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-psm-tags-input\",null,[[\"post\"],[[25,[\"post\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      let selected = (0, _testHelpers.findAll)('.tag-token');
      (0, _chai.expect)(selected.length).to.equal(2);
      (0, _chai.expect)(selected[0]).to.have.class('tag-token--internal');
      (0, _chai.expect)(selected[1]).to.not.have.class('tag-token--internal');
    });
    (0, _mocha.describe)('updateTags', function () {
      (0, _mocha.it)('modifies post.tags', async function () {
        await assignPostWithTags(this, 'two', 'three');
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "L4YiSdZI",
          "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-psm-tags-input\",null,[[\"post\"],[[25,[\"post\"]]]]],false]],\"hasEval\":false}",
          "meta": {}
        }));
        await (0, _helpers.selectChoose)('.ember-power-select-trigger', 'Tag 1');
        (0, _chai.expect)(this.post.tags.mapBy('name').join(',')).to.equal('#Tag 2,Tag 3,Tag 1');
      }); // TODO: skipped due to consistently random failures on Travis
      // '#ember-basic-dropdown-content-ember17494 Add "New"...' is not a valid selector
      // https://github.com/TryGhost/Ghost/issues/10308

      _mocha.it.skip('destroys new tag records when not selected', async function () {
        await assignPostWithTags(this, 'two', 'three');
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "L4YiSdZI",
          "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-psm-tags-input\",null,[[\"post\"],[[25,[\"post\"]]]]],false]],\"hasEval\":false}",
          "meta": {}
        }));
        await (0, _helpers.clickTrigger)();
        await (0, _helpers.typeInSearch)('New');
        await (0, _testHelpers.settled)();
        await (0, _helpers.selectChoose)('.ember-power-select-trigger', 'Add "New"...');
        let tags = await this.store.peekAll('tag');
        (0, _chai.expect)(tags.length).to.equal(5);
        let removeBtns = (0, _testHelpers.findAll)('.ember-power-select-multiple-remove-btn');
        await (0, _testHelpers.click)(removeBtns[removeBtns.length - 1]);
        tags = await this.store.peekAll('tag');
        (0, _chai.expect)(tags.length).to.equal(4);
      });
    });
    (0, _mocha.describe)('createTag', function () {
      (0, _mocha.it)('creates new records', async function () {
        await assignPostWithTags(this, 'two', 'three');
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "L4YiSdZI",
          "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-psm-tags-input\",null,[[\"post\"],[[25,[\"post\"]]]]],false]],\"hasEval\":false}",
          "meta": {}
        }));
        await (0, _helpers.clickTrigger)();
        await (0, _helpers.typeInSearch)('New One');
        await (0, _testHelpers.settled)();
        await (0, _helpers.selectChoose)('.ember-power-select-trigger', '.ember-power-select-option', 0);
        await (0, _helpers.typeInSearch)('New Two');
        await (0, _testHelpers.settled)();
        await (0, _helpers.selectChoose)('.ember-power-select-trigger', '.ember-power-select-option', 0);
        let tags = await this.store.peekAll('tag');
        (0, _chai.expect)(tags.length).to.equal(6);
        (0, _chai.expect)(tags.findBy('name', 'New One').isNew).to.be.true;
        (0, _chai.expect)(tags.findBy('name', 'New Two').isNew).to.be.true;
      });
    });
  });
});
define("ghost-admin/tests/integration/components/gh-psm-template-select-test", ["ghost-admin/mirage/config/themes", "ember-test-helpers/wait", "mocha", "chai", "@ember/test-helpers", "ember-mocha", "ghost-admin/initializers/ember-cli-mirage"], function (_themes, _wait, _mocha, _chai, _testHelpers, _emberMocha, _emberCliMirage) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-psm-template-select', function () {
    (0, _emberMocha.setupRenderingTest)();
    let server;
    beforeEach(function () {
      server = (0, _emberCliMirage.startMirage)();
      server.create('theme', {
        active: true,
        name: 'example-theme',
        package: {
          name: 'Example Theme',
          version: '0.1'
        },
        templates: [{
          filename: 'custom-news-bulletin.hbs',
          name: 'News Bulletin',
          for: ['post', 'page'],
          slug: null
        }, {
          filename: 'custom-big-images.hbs',
          name: 'Big Images',
          for: ['post', 'page'],
          slug: null
        }, {
          filename: 'post-one.hbs',
          name: 'One',
          for: ['post'],
          slug: 'one'
        }, {
          filename: 'page-about.hbs',
          name: 'About',
          for: ['page'],
          slug: 'about'
        }]
      });
      (0, _themes.default)(server);
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('disables template selector if slug matches post template', async function () {
      this.set('post', {
        slug: 'one',
        constructor: {
          modelName: 'post'
        }
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "o3XIvxaA",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-psm-template-select\",null,[[\"post\"],[[25,[\"post\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _wait.default)();
      (0, _chai.expect)((0, _testHelpers.find)('select').disabled, 'select is disabled').to.be.true;
      (0, _chai.expect)((0, _testHelpers.find)('p')).to.contain.text('post-one.hbs');
    });
    (0, _mocha.it)('disables template selector if slug matches page template', async function () {
      this.set('post', {
        slug: 'about',
        constructor: {
          modelName: 'page'
        }
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "o3XIvxaA",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-psm-template-select\",null,[[\"post\"],[[25,[\"post\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _wait.default)();
      (0, _chai.expect)((0, _testHelpers.find)('select').disabled, 'select is disabled').to.be.true;
      (0, _chai.expect)((0, _testHelpers.find)('p')).to.contain.text('page-about.hbs');
    });
  });
});
define("ghost-admin/tests/integration/components/gh-search-input-test", ["pretender", "mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_pretender, _mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-search-input', function () {
    (0, _emberMocha.setupRenderingTest)();
    let server;
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('renders', async function () {
      // renders the component on the page
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "0v30zJFx",
        "block": "{\"symbols\":[],\"statements\":[[1,[23,\"gh-search-input\"],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)(this.$('.ember-power-select-search input')).to.have.length(1);
    });
    (0, _mocha.it)('opens the dropdown on text entry', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "0v30zJFx",
        "block": "{\"symbols\":[],\"statements\":[[1,[23,\"gh-search-input\"],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.fillIn)('input[type="search"]', 'test');
      (0, _chai.expect)((0, _testHelpers.findAll)('.ember-basic-dropdown-content').length).to.equal(1);
    });
  });
});
define("ghost-admin/tests/integration/components/gh-tag-settings-form-test", ["ember-data", "@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_emberData, _testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  const Errors = _emberData.default.Errors;
  let configStub = Ember.Service.extend({
    blogUrl: 'http://localhost:2368'
  });
  let mediaQueriesStub = Ember.Service.extend({
    maxWidth600: false
  });
  (0, _mocha.describe)('Integration: Component: gh-tag-settings-form', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      /* eslint-disable camelcase */
      let tag = Ember.Object.create({
        id: 1,
        name: 'Test',
        slug: 'test',
        description: 'Description.',
        metaTitle: 'Meta Title',
        metaDescription: 'Meta description',
        errors: Errors.create(),
        hasValidated: []
      });
      /* eslint-enable camelcase */

      this.set('tag', tag);
      this.set('setProperty', function (property, value) {
        // this should be overridden if a call is expected
        // eslint-disable-next-line no-console
        console.error("setProperty called '".concat(property, ": ").concat(value, "'"));
      });
      this.owner.register('service:config', configStub);
      this.owner.register('service:media-queries', mediaQueriesStub);
    });
    (0, _mocha.it)('renders', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Gl88TBDu",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-tag-settings-form\",null,[[\"tag\",\"setProperty\"],[[25,[\"tag\"]],[29,\"action\",[[24,0,[]],[25,[\"setProperty\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)(this.$()).to.have.length(1);
    });
    (0, _mocha.it)('has the correct title', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Gl88TBDu",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-tag-settings-form\",null,[[\"tag\",\"setProperty\"],[[25,[\"tag\"]],[29,\"action\",[[24,0,[]],[25,[\"setProperty\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane h4').textContent, 'existing tag title').to.equal('Tag settings');
      this.set('tag.isNew', true);
      (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane h4').textContent, 'new tag title').to.equal('New tag');
    });
    (0, _mocha.it)('renders main settings', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Gl88TBDu",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-tag-settings-form\",null,[[\"tag\",\"setProperty\"],[[25,[\"tag\"]],[29,\"action\",[[24,0,[]],[25,[\"setProperty\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.findAll)('.gh-image-uploader').length, 'displays image uploader').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('input[name="name"]').value, 'name field value').to.equal('Test');
      (0, _chai.expect)((0, _testHelpers.find)('input[name="slug"]').value, 'slug field value').to.equal('test');
      (0, _chai.expect)((0, _testHelpers.find)('textarea[name="description"]').value, 'description field value').to.equal('Description.');
      (0, _chai.expect)((0, _testHelpers.find)('input[name="metaTitle"]').value, 'metaTitle field value').to.equal('Meta Title');
      (0, _chai.expect)((0, _testHelpers.find)('textarea[name="metaDescription"]').value, 'metaDescription field value').to.equal('Meta description');
    });
    (0, _mocha.it)('can switch between main/meta settings', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Gl88TBDu",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-tag-settings-form\",null,[[\"tag\",\"setProperty\"],[[25,[\"tag\"]],[29,\"action\",[[24,0,[]],[25,[\"setProperty\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane').classList.contains('settings-menu-pane-in'), 'main settings are displayed by default').to.be.true;
      (0, _chai.expect)((0, _testHelpers.find)('.tag-meta-settings-pane').classList.contains('settings-menu-pane-out-right'), 'meta settings are hidden by default').to.be.true;
      await (0, _testHelpers.click)('.meta-data-button');
      (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane').classList.contains('settings-menu-pane-out-left'), 'main settings are hidden after clicking Meta Data button').to.be.true;
      (0, _chai.expect)((0, _testHelpers.find)('.tag-meta-settings-pane').classList.contains('settings-menu-pane-in'), 'meta settings are displayed after clicking Meta Data button').to.be.true;
      await (0, _testHelpers.click)('.back');
      (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane').classList.contains('settings-menu-pane-in'), 'main settings are displayed after clicking "back"').to.be.true;
      (0, _chai.expect)((0, _testHelpers.find)('.tag-meta-settings-pane').classList.contains('settings-menu-pane-out-right'), 'meta settings are hidden after clicking "back"').to.be.true;
    });
    (0, _mocha.it)('has one-way binding for properties', async function () {
      this.set('setProperty', function () {// noop
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Gl88TBDu",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-tag-settings-form\",null,[[\"tag\",\"setProperty\"],[[25,[\"tag\"]],[29,\"action\",[[24,0,[]],[25,[\"setProperty\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.fillIn)('input[name="name"]', 'New name');
      await (0, _testHelpers.fillIn)('input[name="slug"]', 'new-slug');
      await (0, _testHelpers.fillIn)('textarea[name="description"]', 'New description');
      await (0, _testHelpers.fillIn)('input[name="metaTitle"]', 'New metaTitle');
      await (0, _testHelpers.fillIn)('textarea[name="metaDescription"]', 'New metaDescription');
      (0, _chai.expect)(this.get('tag.name'), 'tag name').to.equal('Test');
      (0, _chai.expect)(this.get('tag.slug'), 'tag slug').to.equal('test');
      (0, _chai.expect)(this.get('tag.description'), 'tag description').to.equal('Description.');
      (0, _chai.expect)(this.get('tag.metaTitle'), 'tag metaTitle').to.equal('Meta Title');
      (0, _chai.expect)(this.get('tag.metaDescription'), 'tag metaDescription').to.equal('Meta description');
    });
    (0, _mocha.it)('triggers setProperty action on blur of all fields', async function () {
      let lastSeenProperty = '';
      let lastSeenValue = '';
      this.set('setProperty', function (property, value) {
        lastSeenProperty = property;
        lastSeenValue = value;
      });

      let testSetProperty = async (selector, expectedProperty, expectedValue) => {
        await (0, _testHelpers.click)(selector);
        await (0, _testHelpers.fillIn)(selector, expectedValue);
        await (0, _testHelpers.blur)(selector);
        (0, _chai.expect)(lastSeenProperty, 'property').to.equal(expectedProperty);
        (0, _chai.expect)(lastSeenValue, 'value').to.equal(expectedValue);
      };

      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Gl88TBDu",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-tag-settings-form\",null,[[\"tag\",\"setProperty\"],[[25,[\"tag\"]],[29,\"action\",[[24,0,[]],[25,[\"setProperty\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      await testSetProperty('input[name="name"]', 'name', 'New name');
      await testSetProperty('input[name="slug"]', 'slug', 'new-slug');
      await testSetProperty('textarea[name="description"]', 'description', 'New description');
      await testSetProperty('input[name="metaTitle"]', 'metaTitle', 'New metaTitle');
      await testSetProperty('textarea[name="metaDescription"]', 'metaDescription', 'New metaDescription');
    });
    (0, _mocha.it)('displays error messages for validated fields', async function () {
      let errors = this.get('tag.errors');
      let hasValidated = this.get('tag.hasValidated');
      errors.add('name', 'must be present');
      hasValidated.push('name');
      errors.add('slug', 'must be present');
      hasValidated.push('slug');
      errors.add('description', 'is too long');
      hasValidated.push('description');
      errors.add('metaTitle', 'is too long');
      hasValidated.push('metaTitle');
      errors.add('metaDescription', 'is too long');
      hasValidated.push('metaDescription');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Gl88TBDu",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-tag-settings-form\",null,[[\"tag\",\"setProperty\"],[[25,[\"tag\"]],[29,\"action\",[[24,0,[]],[25,[\"setProperty\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      let nameFormGroup = this.$('input[name="name"]').closest('.form-group');
      (0, _chai.expect)(nameFormGroup.hasClass('error'), 'name form group has error state').to.be.true;
      (0, _chai.expect)(nameFormGroup.find('.response').length, 'name form group has error message').to.equal(1);
      let slugFormGroup = this.$('input[name="slug"]').closest('.form-group');
      (0, _chai.expect)(slugFormGroup.hasClass('error'), 'slug form group has error state').to.be.true;
      (0, _chai.expect)(slugFormGroup.find('.response').length, 'slug form group has error message').to.equal(1);
      let descriptionFormGroup = this.$('textarea[name="description"]').closest('.form-group');
      (0, _chai.expect)(descriptionFormGroup.hasClass('error'), 'description form group has error state').to.be.true;
      let metaTitleFormGroup = this.$('input[name="metaTitle"]').closest('.form-group');
      (0, _chai.expect)(metaTitleFormGroup.hasClass('error'), 'metaTitle form group has error state').to.be.true;
      (0, _chai.expect)(metaTitleFormGroup.find('.response').length, 'metaTitle form group has error message').to.equal(1);
      let metaDescriptionFormGroup = this.$('textarea[name="metaDescription"]').closest('.form-group');
      (0, _chai.expect)(metaDescriptionFormGroup.hasClass('error'), 'metaDescription form group has error state').to.be.true;
      (0, _chai.expect)(metaDescriptionFormGroup.find('.response').length, 'metaDescription form group has error message').to.equal(1);
    });
    (0, _mocha.it)('displays char count for text fields', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Gl88TBDu",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-tag-settings-form\",null,[[\"tag\",\"setProperty\"],[[25,[\"tag\"]],[29,\"action\",[[24,0,[]],[25,[\"setProperty\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      let descriptionFormGroup = this.$('textarea[name="description"]').closest('.form-group');
      (0, _chai.expect)(descriptionFormGroup.find('.word-count').text(), 'description char count').to.equal('12');
      let metaDescriptionFormGroup = this.$('textarea[name="metaDescription"]').closest('.form-group');
      (0, _chai.expect)(metaDescriptionFormGroup.find('.word-count').text(), 'description char count').to.equal('16');
    });
    (0, _mocha.it)('renders SEO title preview', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Gl88TBDu",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-tag-settings-form\",null,[[\"tag\",\"setProperty\"],[[25,[\"tag\"]],[29,\"action\",[[24,0,[]],[25,[\"setProperty\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.seo-preview-title').textContent, 'displays meta title if present').to.equal('Meta Title');
      this.set('tag.metaTitle', '');
      (0, _chai.expect)((0, _testHelpers.find)('.seo-preview-title').textContent, 'falls back to tag name without metaTitle').to.equal('Test');
      this.set('tag.name', new Array(151).join('x'));
      let expectedLength = 70 + '…'.length;
      (0, _chai.expect)((0, _testHelpers.find)('.seo-preview-title').textContent.length, 'cuts title to max 70 chars').to.equal(expectedLength);
    });
    (0, _mocha.it)('renders SEO URL preview', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Gl88TBDu",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-tag-settings-form\",null,[[\"tag\",\"setProperty\"],[[25,[\"tag\"]],[29,\"action\",[[24,0,[]],[25,[\"setProperty\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.seo-preview-link').textContent, 'adds url and tag prefix').to.equal('http://localhost:2368/tag/test/');
      this.set('tag.slug', new Array(151).join('x'));
      let expectedLength = 70 + '…'.length;
      (0, _chai.expect)((0, _testHelpers.find)('.seo-preview-link').textContent.length, 'cuts slug to max 70 chars').to.equal(expectedLength);
    });
    (0, _mocha.it)('renders SEO description preview', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Gl88TBDu",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-tag-settings-form\",null,[[\"tag\",\"setProperty\"],[[25,[\"tag\"]],[29,\"action\",[[24,0,[]],[25,[\"setProperty\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.seo-preview-description').textContent, 'displays meta description if present').to.equal('Meta description');
      this.set('tag.metaDescription', '');
      (0, _chai.expect)((0, _testHelpers.find)('.seo-preview-description').textContent, 'falls back to tag description without metaDescription').to.equal('Description.');
      this.set('tag.description', new Array(500).join('x'));
      let expectedLength = 156 + '…'.length;
      (0, _chai.expect)((0, _testHelpers.find)('.seo-preview-description').textContent.length, 'cuts description to max 156 chars').to.equal(expectedLength);
    });
    (0, _mocha.it)('resets if a new tag is received', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Gl88TBDu",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-tag-settings-form\",null,[[\"tag\",\"setProperty\"],[[25,[\"tag\"]],[29,\"action\",[[24,0,[]],[25,[\"setProperty\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.click)('.meta-data-button');
      (0, _chai.expect)((0, _testHelpers.find)('.tag-meta-settings-pane').classList.contains('settings-menu-pane-in'), 'meta data pane is shown').to.be.true;
      this.set('tag', Ember.Object.create({
        id: '2'
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane').classList.contains('settings-menu-pane-in'), 'resets to main settings').to.be.true;
    });
    (0, _mocha.it)('triggers delete tag modal on delete click', async function () {
      let openModalFired = false;
      this.set('openModal', () => {
        openModalFired = true;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "SOX6VQnL",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-tag-settings-form\",null,[[\"tag\",\"setProperty\",\"showDeleteTagModal\"],[[25,[\"tag\"]],[29,\"action\",[[24,0,[]],[25,[\"setProperty\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"openModal\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.click)('.settings-menu-delete-button');
      (0, _chai.expect)(openModalFired).to.be.true;
    });
    (0, _mocha.it)('shows settings.tags arrow link on mobile', async function () {
      let mediaQueries = this.owner.lookup('service:media-queries');
      mediaQueries.set('maxWidth600', true);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Gl88TBDu",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n            \"],[1,[29,\"gh-tag-settings-form\",null,[[\"tag\",\"setProperty\"],[[25,[\"tag\"]],[29,\"action\",[[24,0,[]],[25,[\"setProperty\"]]],null]]]],false],[0,\"\\n        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.findAll)('.tag-settings-pane .settings-menu-header .settings-menu-header-action').length, 'settings.tags link is shown').to.equal(1);
    });
  });
});
define("ghost-admin/tests/integration/components/gh-task-button-test", ["@ember/test-helpers", "mocha", "chai", "ember-mocha", "ember-concurrency"], function (_testHelpers, _mocha, _chai, _emberMocha, _emberConcurrency) {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  (0, _mocha.describe)('Integration: Component: gh-task-button', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders', async function () {
      // sets button text using positional param
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "P5Lpg/32",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-task-button\",[\"Test\"],null],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.contain.text('Test');
      (0, _chai.expect)((0, _testHelpers.find)('button').disabled).to.be.false;
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "josj29Nr",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-task-button\",null,[[\"class\"],[\"testing\"]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.have.class('testing'); // default button text is "Save"

      (0, _chai.expect)((0, _testHelpers.find)('button')).to.contain.text('Save'); // passes disabled attr

      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "aHDZXLW8",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-task-button\",null,[[\"disabled\",\"buttonText\"],[true,\"Test\"]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('button').disabled).to.be.true; // allows button text to be set via hash param

      (0, _chai.expect)((0, _testHelpers.find)('button')).to.contain.text('Test'); // passes type attr

      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "h7YE/Qh/",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-task-button\",null,[[\"type\"],[\"submit\"]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.have.attr('type', 'submit'); // passes tabindex attr

      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "IxAXoF0l",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-task-button\",null,[[\"tabindex\"],[\"-1\"]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.have.attr('tabindex', '-1');
    });
    (0, _mocha.it)('shows spinner whilst running', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "iRKZq5Li",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-task-button\",null,[[\"task\"],[[25,[\"myTask\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      this.myTask.perform();
      await (0, _testHelpers.waitFor)('button svg', {
        timeout: 50
      });
      await (0, _testHelpers.settled)();
    });
    (0, _mocha.it)('shows running text when passed whilst running', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "BCCsrAvb",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-task-button\",null,[[\"task\",\"runningText\"],[[25,[\"myTask\"]],\"Running\"]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      this.myTask.perform();
      await (0, _testHelpers.waitFor)('button svg', {
        timeout: 50
      });
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.contain.text('Running');
      await (0, _testHelpers.settled)();
    }); // skipped due to random failures on Travis - https://github.com/TryGhost/Ghost/issues/10308

    (0, _mocha.it)('appears disabled whilst running', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "iRKZq5Li",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-task-button\",null,[[\"task\"],[[25,[\"myTask\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('button'), 'initial class').to.not.have.class('appear-disabled');
      this.myTask.perform();
      await (0, _testHelpers.waitFor)('button.appear-disabled', {
        timeout: 50
      });
      await (0, _testHelpers.settled)();
      (0, _chai.expect)((0, _testHelpers.find)('button'), 'ended class').to.not.have.class('appear-disabled');
    });
    (0, _mocha.it)('shows success on success', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
        return true;
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "iRKZq5Li",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-task-button\",null,[[\"task\"],[[25,[\"myTask\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await this.myTask.perform();
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.have.class('gh-btn-green');
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.contain.text('Saved');
    });
    (0, _mocha.it)('assigns specified success class on success', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
        return true;
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "y+tiP60x",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-task-button\",null,[[\"task\",\"successClass\"],[[25,[\"myTask\"]],\"im-a-success\"]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await this.myTask.perform();
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.not.have.class('gh-btn-green');
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.have.class('im-a-success');
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.contain.text('Saved');
    });
    (0, _mocha.it)('shows failure when task errors', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        try {
          yield (0, _emberConcurrency.timeout)(50);
          throw new ReferenceError('test error');
        } catch (error) {// noop, prevent mocha triggering unhandled error assert
        }
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "CKCyp7d4",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-task-button\",null,[[\"task\",\"failureClass\"],[[25,[\"myTask\"]],\"is-failed\"]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      this.myTask.perform();
      await (0, _testHelpers.waitFor)('button.is-failed');
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.contain.text('Retry');
      await (0, _testHelpers.settled)();
    });
    (0, _mocha.it)('shows failure on falsy response', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
        return false;
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "iRKZq5Li",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-task-button\",null,[[\"task\"],[[25,[\"myTask\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      this.myTask.perform();
      await (0, _testHelpers.waitFor)('button.gh-btn-red', {
        timeout: 50
      });
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.contain.text('Retry');
      await (0, _testHelpers.settled)();
    });
    (0, _mocha.it)('assigns specified failure class on failure', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
        return false;
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "MDpL8yV0",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-task-button\",null,[[\"task\",\"failureClass\"],[[25,[\"myTask\"]],\"im-a-failure\"]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      this.myTask.perform();
      await (0, _testHelpers.waitFor)('button.im-a-failure', {
        timeout: 50
      });
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.not.have.class('gh-btn-red');
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.contain.text('Retry');
      await (0, _testHelpers.settled)();
    });
    (0, _mocha.it)('performs task on click', async function () {
      let taskCount = 0;
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
        taskCount = taskCount + 1;
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "iRKZq5Li",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-task-button\",null,[[\"task\"],[[25,[\"myTask\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.click)('button');
      await (0, _testHelpers.settled)();
      (0, _chai.expect)(taskCount, 'taskCount').to.equal(1);
    });

    _mocha.it.skip('keeps button size when showing spinner', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "iRKZq5Li",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-task-button\",null,[[\"task\"],[[25,[\"myTask\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      let width = (0, _testHelpers.find)('button').clientWidth;
      let height = (0, _testHelpers.find)('button').clientHeight;
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.not.have.attr('style');
      this.myTask.perform();
      Ember.run.later(this, function () {
        // we can't test exact width/height because Chrome/Firefox use different rounding methods
        // expect(find('button')).to.have.attr('style', `width: ${width}px; height: ${height}px;`);
        let _width$toString$split = width.toString().split('.'),
            _width$toString$split2 = _slicedToArray(_width$toString$split, 1),
            widthInt = _width$toString$split2[0];

        let _height$toString$spli = height.toString().split('.'),
            _height$toString$spli2 = _slicedToArray(_height$toString$spli, 1),
            heightInt = _height$toString$spli2[0];

        (0, _chai.expect)((0, _testHelpers.find)('button')).to.have.attr('style', "width: ".concat(widthInt));
        (0, _chai.expect)((0, _testHelpers.find)('button')).to.have.attr('style', "height: ".concat(heightInt));
      }, 20);
      Ember.run.later(this, function () {
        (0, _chai.expect)((0, _testHelpers.find)('button').getAttribute('style')).to.be.empty;
      }, 100);
      await (0, _testHelpers.settled)();
    });
  });
});
define("ghost-admin/tests/integration/components/gh-theme-table-test", ["sinon", "@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_sinon, _testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-theme-table', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders', async function () {
      this.set('themes', [{
        name: 'Daring',
        package: {
          name: 'Daring',
          version: '0.1.4'
        },
        active: true
      }, {
        name: 'casper',
        package: {
          name: 'Casper',
          version: '1.3.1'
        }
      }, {
        name: 'oscar-ghost-1.1.0',
        package: {
          name: 'Lanyon',
          version: '1.1.0'
        }
      }, {
        name: 'foo'
      }]);
      this.set('actionHandler', _sinon.default.spy());
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "qMmowzZ+",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-theme-table\",null,[[\"themes\",\"activateTheme\",\"downloadTheme\",\"deleteTheme\"],[[25,[\"themes\"]],[29,\"action\",[[24,0,[]],[25,[\"actionHandler\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"actionHandler\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"actionHandler\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-themes-list]').length, 'themes list is present').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-theme-id]').length, 'number of rows').to.equal(4);
      let packageNames = (0, _testHelpers.findAll)('[data-test-theme-title]').map(name => name.textContent.trim());
      (0, _chai.expect)(packageNames, 'themes are ordered by label, casper has "default"').to.deep.equal(['Casper (default)', 'Daring', 'foo', 'Lanyon']);
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-active="true"]').querySelector('[data-test-theme-title]'), 'active theme is highlighted').to.have.trimmed.text('Daring');
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-theme-activate-button]').length, 'non-active themes have an activate link').to.equal(3);
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-active="true"]').querySelector('[data-test-theme-activate-button]'), 'active theme doesn\'t have an activate link').to.not.exist;
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-theme-download-button]').length, 'all themes have a download link').to.equal(4);
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-id="foo"]').querySelector('[data-test-theme-delete-button]'), 'non-active, non-casper theme has delete link').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-id="casper"]').querySelector('[data-test-theme-delete-button]'), 'casper doesn\'t have delete link').to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-active="true"]').querySelector('[data-test-theme-delete-button]'), 'active theme doesn\'t have delete link').to.not.exist;
    });
    (0, _mocha.it)('delete link triggers passed in action', async function () {
      let deleteAction = _sinon.default.spy();

      let actionHandler = _sinon.default.spy();

      this.set('themes', [{
        name: 'Foo',
        active: true
      }, {
        name: 'Bar'
      }]);
      this.set('deleteAction', deleteAction);
      this.set('actionHandler', actionHandler);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "eUFYMakT",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-theme-table\",null,[[\"themes\",\"activateTheme\",\"downloadTheme\",\"deleteTheme\"],[[25,[\"themes\"]],[29,\"action\",[[24,0,[]],[25,[\"actionHandler\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"actionHandler\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"deleteAction\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.click)('[data-test-theme-id="Bar"] [data-test-theme-delete-button]');
      (0, _chai.expect)(deleteAction.calledOnce).to.be.true;
      (0, _chai.expect)(deleteAction.firstCall.args[0].name).to.equal('Bar');
    });
    (0, _mocha.it)('download link triggers passed in action', async function () {
      let downloadAction = _sinon.default.spy();

      let actionHandler = _sinon.default.spy();

      this.set('themes', [{
        name: 'Foo',
        active: true
      }, {
        name: 'Bar'
      }]);
      this.set('downloadAction', downloadAction);
      this.set('actionHandler', actionHandler);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "8A2icIZ+",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-theme-table\",null,[[\"themes\",\"activateTheme\",\"downloadTheme\",\"deleteTheme\"],[[25,[\"themes\"]],[29,\"action\",[[24,0,[]],[25,[\"actionHandler\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"downloadAction\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"actionHandler\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.click)('[data-test-theme-id="Foo"] [data-test-theme-download-button]');
      (0, _chai.expect)(downloadAction.calledOnce).to.be.true;
      (0, _chai.expect)(downloadAction.firstCall.args[0].name).to.equal('Foo');
    });
    (0, _mocha.it)('activate link triggers passed in action', async function () {
      let activateAction = _sinon.default.spy();

      let actionHandler = _sinon.default.spy();

      this.set('themes', [{
        name: 'Foo',
        active: true
      }, {
        name: 'Bar'
      }]);
      this.set('activateAction', activateAction);
      this.set('actionHandler', actionHandler);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "QtVxTJRx",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-theme-table\",null,[[\"themes\",\"activateTheme\",\"downloadTheme\",\"deleteTheme\"],[[25,[\"themes\"]],[29,\"action\",[[24,0,[]],[25,[\"activateAction\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"actionHandler\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"actionHandler\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.click)('[data-test-theme-id="Bar"] [data-test-theme-activate-button]');
      (0, _chai.expect)(activateAction.calledOnce).to.be.true;
      (0, _chai.expect)(activateAction.firstCall.args[0].name).to.equal('Bar');
    });
    (0, _mocha.it)('displays folder names if there are duplicate package names', async function () {
      this.set('themes', [{
        name: 'daring',
        package: {
          name: 'Daring',
          version: '0.1.4'
        },
        active: true
      }, {
        name: 'daring-0.1.5',
        package: {
          name: 'Daring',
          version: '0.1.4'
        }
      }, {
        name: 'casper',
        package: {
          name: 'Casper',
          version: '1.3.1'
        }
      }, {
        name: 'another',
        package: {
          name: 'Casper',
          version: '1.3.1'
        }
      }, {
        name: 'mine',
        package: {
          name: 'Casper',
          version: '1.3.1'
        }
      }, {
        name: 'foo'
      }]);
      this.set('actionHandler', _sinon.default.spy());
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "qMmowzZ+",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-theme-table\",null,[[\"themes\",\"activateTheme\",\"downloadTheme\",\"deleteTheme\"],[[25,[\"themes\"]],[29,\"action\",[[24,0,[]],[25,[\"actionHandler\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"actionHandler\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"actionHandler\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      let packageNames = (0, _testHelpers.findAll)('[data-test-theme-title]').map(name => name.textContent.trim());
      (0, _chai.expect)(packageNames, 'themes are ordered by label, folder names shown for duplicates').to.deep.equal(['Casper (another)', 'Casper (default)', 'Casper (mine)', 'Daring (daring)', 'Daring (daring-0.1.5)', 'foo']);
    });
  });
});
define("ghost-admin/tests/integration/components/gh-timezone-select-test", ["sinon", "@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_sinon, _testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-timezone-select', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      this.set('availableTimezones', [{
        name: 'Pacific/Pago_Pago',
        label: '(GMT -11:00) Midway Island, Samoa'
      }, {
        name: 'Etc/UTC',
        label: '(GMT) UTC'
      }, {
        name: 'Pacific/Kwajalein',
        label: '(GMT +12:00) International Date Line West'
      }]);
      this.set('activeTimezone', 'Etc/UTC');
    });
    (0, _mocha.it)('renders', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "G73IOaRn",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-timezone-select\",null,[[\"availableTimezones\",\"activeTimezone\"],[[25,[\"availableTimezones\"]],[25,[\"activeTimezone\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)(this.element, 'top-level elements').to.exist;
      (0, _chai.expect)((0, _testHelpers.findAll)('option'), 'number of options').to.have.length(3);
      (0, _chai.expect)((0, _testHelpers.find)('select').value, 'selected option value').to.equal('Etc/UTC');
    });
    (0, _mocha.it)('handles an unknown timezone', async function () {
      this.set('activeTimezone', 'Europe/London');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "G73IOaRn",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-timezone-select\",null,[[\"availableTimezones\",\"activeTimezone\"],[[25,[\"availableTimezones\"]],[25,[\"activeTimezone\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      })); // we have an additional blank option at the top

      (0, _chai.expect)((0, _testHelpers.findAll)('option'), 'number of options').to.have.length(4); // blank option is selected

      (0, _chai.expect)((0, _testHelpers.find)('select').value, 'selected option value').to.equal(''); // we indicate the manual override

      (0, _chai.expect)((0, _testHelpers.find)('p').textContent).to.match(/Your timezone has been automatically set to Europe\/London/);
    });
    (0, _mocha.it)('triggers update action on change', async function () {
      let update = _sinon.default.spy();

      this.set('update', update);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "8B2OJuM2",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-timezone-select\",null,[[\"availableTimezones\",\"activeTimezone\",\"update\"],[[25,[\"availableTimezones\"]],[25,[\"activeTimezone\"]],[29,\"action\",[[24,0,[]],[25,[\"update\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.fillIn)('select', 'Pacific/Pago_Pago');
      await (0, _testHelpers.blur)('select');
      (0, _chai.expect)(update.calledOnce, 'update was called once').to.be.true;
      (0, _chai.expect)(update.firstCall.args[0].name, 'update was passed new timezone').to.equal('Pacific/Pago_Pago');
    }); // TODO: mock clock service, fake the time, test we have the correct
    // local time and it changes alongside selection changes

    (0, _mocha.it)('renders local time');
  });
});
define("ghost-admin/tests/integration/components/gh-trim-focus-input-test", ["@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-trim-focus-input', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('trims value on focusOut', async function () {
      this.set('text', 'some random stuff    ');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "UOOkObxI",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-trim-focus-input\",null,[[\"value\",\"input\"],[[29,\"readonly\",[[25,[\"text\"]]],null],[29,\"action\",[[24,0,[]],[29,\"mut\",[[25,[\"text\"]]],null]],[[\"value\"],[\"target.value\"]]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.blur)('input');
      (0, _chai.expect)(this.get('text')).to.equal('some random stuff');
    });
    (0, _mocha.it)('trims value on focusOut before calling custom focus-out', async function () {
      this.set('text', 'some random stuff    ');
      this.set('customFocusOut', function (value) {
        (0, _chai.expect)((0, _testHelpers.find)('.gh-input').value, 'input value').to.equal('some random stuff');
        (0, _chai.expect)(value, 'value').to.equal('some random stuff');
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "i+/vG68C",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-trim-focus-input\",null,[[\"value\",\"input\",\"focus-out\"],[[29,\"readonly\",[[25,[\"text\"]]],null],[29,\"action\",[[24,0,[]],[29,\"mut\",[[25,[\"text\"]]],null]],[[\"value\"],[\"target.value\"]]],[29,\"action\",[[24,0,[]],[25,[\"customFocusOut\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.blur)('input');
      (0, _chai.expect)(this.get('text')).to.equal('some random stuff');
    });
    (0, _mocha.it)('does not have the autofocus attribute if not set to focus', async function () {
      this.set('text', 'some text');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "u9QLRPw2",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-trim-focus-input\",null,[[\"value\",\"shouldFocus\"],[[29,\"readonly\",[[25,[\"text\"]]],null],false]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input').autofocus).to.not.be.ok;
    });
    (0, _mocha.it)('has the autofocus attribute if set to focus', async function () {
      this.set('text', 'some text');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Mucn91gl",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-trim-focus-input\",null,[[\"value\",\"shouldFocus\"],[[29,\"readonly\",[[25,[\"text\"]]],null],true]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input').autofocus).to.be.ok;
    });
    (0, _mocha.it)('handles undefined values', async function () {
      this.set('text', undefined);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Mucn91gl",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-trim-focus-input\",null,[[\"value\",\"shouldFocus\"],[[29,\"readonly\",[[25,[\"text\"]]],null],true]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input').autofocus).to.be.ok;
    });
    (0, _mocha.it)('handles non-string values', async function () {
      this.set('text', 10);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "Mucn91gl",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-trim-focus-input\",null,[[\"value\",\"shouldFocus\"],[[29,\"readonly\",[[25,[\"text\"]]],null],true]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input').value).to.equal('10');
    });
  });
});
define("ghost-admin/tests/integration/components/gh-unsplash-photo-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-unsplash-photo', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      // NOTE: images.unsplash.com replaced with example.com to ensure we aren't
      // loading lots of images during tests and we get an immediate 404
      this.set('photo', {
        id: 'OYFHT4X5isg',
        created_at: '2017-08-09T00:20:42-04:00',
        updated_at: '2017-08-11T08:27:42-04:00',
        width: 5184,
        height: 3456,
        color: '#A8A99B',
        likes: 58,
        liked_by_user: false,
        description: null,
        user: {
          id: 'cEpP9pR9Q7E',
          updated_at: '2017-08-11T08:27:42-04:00',
          username: 'danotis',
          name: 'Dan Otis',
          first_name: 'Dan',
          last_name: 'Otis',
          twitter_username: 'danotis',
          portfolio_url: 'http://dan.exposure.co',
          bio: 'Senior Visual Designer at Huge ',
          location: 'San Jose, CA',
          total_likes: 0,
          total_photos: 8,
          total_collections: 0,
          profile_image: {
            small: 'https://example.com/profile-fb-1502251227-8fe7a0522137.jpg?ixlib=rb-0.3.5&q=80&fm=jpg&crop=faces&cs=tinysrgb&fit=crop&h=32&w=32&s=37f67120fc464d7d920ff23c84963b38',
            medium: 'https://example.com/profile-fb-1502251227-8fe7a0522137.jpg?ixlib=rb-0.3.5&q=80&fm=jpg&crop=faces&cs=tinysrgb&fit=crop&h=64&w=64&s=0a4f8a583caec826ac6b1ca80161fa43',
            large: 'https://example.com/profile-fb-1502251227-8fe7a0522137.jpg?ixlib=rb-0.3.5&q=80&fm=jpg&crop=faces&cs=tinysrgb&fit=crop&h=128&w=128&s=b3aa4206e5d87f3eaa7bbe9180ebcd2b'
          },
          links: {
            self: 'https://api.unsplash.com/users/danotis',
            html: 'https://unsplash.com/@danotis',
            photos: 'https://api.unsplash.com/users/danotis/photos',
            likes: 'https://api.unsplash.com/users/danotis/likes',
            portfolio: 'https://api.unsplash.com/users/danotis/portfolio',
            following: 'https://api.unsplash.com/users/danotis/following',
            followers: 'https://api.unsplash.com/users/danotis/followers'
          }
        },
        current_user_collections: [],
        urls: {
          raw: 'https://example.com/photo-1502252430442-aac78f397426',
          full: 'https://example.com/photo-1502252430442-aac78f397426?ixlib=rb-0.3.5&q=85&fm=jpg&crop=entropy&cs=srgb&s=20f86c2f7bbb019122498a45d8260ee9',
          regular: 'https://example.com/photo-1502252430442-aac78f397426?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&s=181760db8b7a61fa60a35277d7eb434e',
          small: 'https://example.com/photo-1502252430442-aac78f397426?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=400&fit=max&s=1e2265597b59e874a1a002b4c3fd961c',
          thumb: 'https://example.com/photo-1502252430442-aac78f397426?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=200&fit=max&s=57c86b0692bea92a282b9ab0dbfdacf4'
        },
        categories: [],
        links: {
          self: 'https://api.unsplash.com/photos/OYFHT4X5isg',
          html: 'https://unsplash.com/photos/OYFHT4X5isg',
          download: 'https://unsplash.com/photos/OYFHT4X5isg/download',
          download_location: 'https://api.unsplash.com/photos/OYFHT4X5isg/download'
        },
        ratio: 0.6666666666666666
      });
    });
    (0, _mocha.it)('sets background-color style', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "ojWYCLNh",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-unsplash-photo\",null,[[\"photo\"],[[25,[\"photo\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-unsplash-photo-container]').attributes.style.value).to.have.string('background-color: #A8A99B');
    });
    (0, _mocha.it)('sets padding-bottom style', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "ojWYCLNh",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-unsplash-photo\",null,[[\"photo\"],[[25,[\"photo\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      })); // don't check full padding-bottom value as it will likely vary across
      // browsers

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-unsplash-photo-container]').attributes.style.value).to.have.string('padding-bottom: 66.66');
    });
    (0, _mocha.it)('uses correct image size url', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "ojWYCLNh",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-unsplash-photo\",null,[[\"photo\"],[[25,[\"photo\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-unsplash-photo-image]').attributes.src.value).to.have.string('&w=1200');
    });
    (0, _mocha.it)('calculates image width/height', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "ojWYCLNh",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"gh-unsplash-photo\",null,[[\"photo\"],[[25,[\"photo\"]]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-unsplash-photo-image]').attributes.width.value).to.equal('1200');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-unsplash-photo-image]').attributes.height.value).to.equal('800');
    });
    (0, _mocha.it)('triggers insert action');
    (0, _mocha.it)('triggers zoom action');
    (0, _mocha.describe)('zoomed', function () {
      (0, _mocha.it)('omits padding-bottom style');
      (0, _mocha.it)('triggers insert action');
      (0, _mocha.it)('triggers zoom action');
    });
  });
});
define("ghost-admin/tests/integration/components/gh-unsplash-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-unsplash', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders', async function () {
      // Set any properties with this.set('myProperty', 'value');
      // Handle any actions with this.on('myAction', function(val) { ... });
      // Template block usage:
      // await render(hbs`
      //   {{#gh-unsplash}}
      //     template content
      //   {{/gh-unsplash}}
      // `);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "7FKOtv14",
        "block": "{\"symbols\":[],\"statements\":[[1,[23,\"gh-unsplash\"],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)(this.$()).to.have.length(1);
    });
    (0, _mocha.it)('loads new photos by default');
    (0, _mocha.it)('has responsive columns');
    (0, _mocha.it)('can zoom');
    (0, _mocha.it)('can close zoom by clicking on image');
    (0, _mocha.it)('can close zoom by clicking outside image');
    (0, _mocha.it)('triggers insert action');
    (0, _mocha.it)('handles errors');
    (0, _mocha.describe)('searching', function () {
      (0, _mocha.it)('works');
      (0, _mocha.it)('handles no results');
      (0, _mocha.it)('handles error');
    });
    (0, _mocha.describe)('closing', function () {
      (0, _mocha.it)('triggers close action');
      (0, _mocha.it)('can be triggerd by escape key');
      (0, _mocha.it)('cannot be triggered by escape key when zoomed');
    });
  });
});
define("ghost-admin/tests/integration/components/gh-uploader-test", ["pretender", "sinon", "@ember/test-helpers", "ghost-admin/tests/helpers/file-upload", "mocha", "chai", "ember-mocha"], function (_pretender, _sinon, _testHelpers, _fileUpload, _mocha, _chai, _emberMocha) {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  const stubSuccessfulUpload = function stubSuccessfulUpload(server) {
    let delay = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    server.post('/ghost/api/v2/admin/images/upload/', function () {
      return [200, {
        'Content-Type': 'application/json'
      }, '{"images": [{"url": "/content/images/test.png"}]}'];
    }, delay);
  };

  const stubFailedUpload = function stubFailedUpload(server, code, error) {
    let delay = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    server.post('/ghost/api/v2/admin/images/upload/', function () {
      return [code, {
        'Content-Type': 'application/json'
      }, JSON.stringify({
        errors: [{
          type: error,
          message: "Error: ".concat(error)
        }]
      })];
    }, delay);
  };

  (0, _mocha.describe)('Integration: Component: gh-uploader', function () {
    (0, _emberMocha.setupRenderingTest)();
    let server;
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.describe)('uploads', function () {
      beforeEach(function () {
        stubSuccessfulUpload(server);
      });
      (0, _mocha.it)('triggers uploads when `files` is set', async function () {
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "MX80iLDO",
          "block": "{\"symbols\":[],\"statements\":[[4,\"gh-uploader\",null,[[\"files\"],[[25,[\"files\"]]]],{\"statements\":[],\"parameters\":[]},null]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)()]);
        await (0, _testHelpers.settled)();

        let _server$handledReques = _slicedToArray(server.handledRequests, 1),
            lastRequest = _server$handledReques[0];

        (0, _chai.expect)(server.handledRequests.length).to.equal(1);
        (0, _chai.expect)(lastRequest.url).to.equal('/ghost/api/v2/admin/images/upload/'); // requestBody is a FormData object
        // this will fail in anything other than Chrome and Firefox
        // https://developer.mozilla.org/en-US/docs/Web/API/FormData#Browser_compatibility

        (0, _chai.expect)(lastRequest.requestBody.has('file')).to.be.true;
      });
      (0, _mocha.it)('triggers multiple uploads', async function () {
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "MX80iLDO",
          "block": "{\"symbols\":[],\"statements\":[[4,\"gh-uploader\",null,[[\"files\"],[[25,[\"files\"]]]],{\"statements\":[],\"parameters\":[]},null]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)(), (0, _fileUpload.createFile)()]);
        await (0, _testHelpers.settled)();
        (0, _chai.expect)(server.handledRequests.length).to.equal(2);
      });
      (0, _mocha.it)('triggers onStart when upload starts', async function () {
        this.set('uploadStarted', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "8Xg4AptG",
          "block": "{\"symbols\":[],\"statements\":[[4,\"gh-uploader\",null,[[\"files\",\"onStart\"],[[25,[\"files\"]],[29,\"action\",[[24,0,[]],[25,[\"uploadStarted\"]]],null]]],{\"statements\":[],\"parameters\":[]},null]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)(), (0, _fileUpload.createFile)()]);
        await (0, _testHelpers.settled)();
        (0, _chai.expect)(this.get('uploadStarted').calledOnce).to.be.true;
      });
      (0, _mocha.it)('triggers onUploadSuccess when a file uploads', async function () {
        this.set('fileUploaded', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "T8ej7UZg",
          "block": "{\"symbols\":[],\"statements\":[[4,\"gh-uploader\",null,[[\"files\",\"onUploadSuccess\"],[[25,[\"files\"]],[29,\"action\",[[24,0,[]],[25,[\"fileUploaded\"]]],null]]],{\"statements\":[],\"parameters\":[]},null]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'file1.png'
        }), (0, _fileUpload.createFile)()]);
        await (0, _testHelpers.settled)(); // triggered for each file

        (0, _chai.expect)(this.get('fileUploaded').calledTwice).to.be.true; // filename and url is passed in arg

        let firstCall = this.get('fileUploaded').getCall(0);
        (0, _chai.expect)(firstCall.args[0].fileName).to.equal('file1.png');
        (0, _chai.expect)(firstCall.args[0].url).to.equal('/content/images/test.png');
      });
      (0, _mocha.it)('triggers onComplete when all files uploaded', async function () {
        this.set('uploadsFinished', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "aPXSLqmO",
          "block": "{\"symbols\":[],\"statements\":[[4,\"gh-uploader\",null,[[\"files\",\"onComplete\"],[[25,[\"files\"]],[29,\"action\",[[24,0,[]],[25,[\"uploadsFinished\"]]],null]]],{\"statements\":[],\"parameters\":[]},null]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'file1.png'
        }), (0, _fileUpload.createFile)(['test'], {
          name: 'file2.png'
        })]);
        await (0, _testHelpers.settled)();
        (0, _chai.expect)(this.get('uploadsFinished').calledOnce).to.be.true; // array of filenames and urls is passed in arg

        let _this$get$getCall$arg = _slicedToArray(this.get('uploadsFinished').getCall(0).args, 1),
            result = _this$get$getCall$arg[0];

        (0, _chai.expect)(result.length).to.equal(2);
        (0, _chai.expect)(result[0].fileName).to.equal('file1.png');
        (0, _chai.expect)(result[0].url).to.equal('/content/images/test.png');
        (0, _chai.expect)(result[1].fileName).to.equal('file2.png');
        (0, _chai.expect)(result[1].url).to.equal('/content/images/test.png');
      });
      (0, _mocha.it)('onComplete only passes results for last upload', async function () {
        this.set('uploadsFinished', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "aPXSLqmO",
          "block": "{\"symbols\":[],\"statements\":[[4,\"gh-uploader\",null,[[\"files\",\"onComplete\"],[[25,[\"files\"]],[29,\"action\",[[24,0,[]],[25,[\"uploadsFinished\"]]],null]]],{\"statements\":[],\"parameters\":[]},null]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'file1.png'
        })]);
        await (0, _testHelpers.settled)();
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'file2.png'
        })]);
        await (0, _testHelpers.settled)();

        let _this$get$getCall$arg2 = _slicedToArray(this.get('uploadsFinished').getCall(1).args, 1),
            results = _this$get$getCall$arg2[0];

        (0, _chai.expect)(results.length).to.equal(1);
        (0, _chai.expect)(results[0].fileName).to.equal('file2.png');
      });
      (0, _mocha.it)('onComplete returns results in same order as selected', async function () {
        // first request has a delay to simulate larger file
        server.post('/ghost/api/v2/admin/images/upload/', function () {
          // second request has no delay to simulate small file
          stubSuccessfulUpload(server, 0);
          return [200, {
            'Content-Type': 'application/json'
          }, '"/content/images/test.png"'];
        }, 100);
        this.set('uploadsFinished', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "aPXSLqmO",
          "block": "{\"symbols\":[],\"statements\":[[4,\"gh-uploader\",null,[[\"files\",\"onComplete\"],[[25,[\"files\"]],[29,\"action\",[[24,0,[]],[25,[\"uploadsFinished\"]]],null]]],{\"statements\":[],\"parameters\":[]},null]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'file1.png'
        }), // large - finishes last
        (0, _fileUpload.createFile)(['test'], {
          name: 'file2.png'
        }) // small - finishes first
        ]);
        await (0, _testHelpers.settled)();

        let _this$get$getCall$arg3 = _slicedToArray(this.get('uploadsFinished').getCall(0).args, 1),
            results = _this$get$getCall$arg3[0];

        (0, _chai.expect)(results.length).to.equal(2);
        (0, _chai.expect)(results[0].fileName).to.equal('file1.png');
      });
      (0, _mocha.it)('doesn\'t allow new files to be set whilst uploading', async function () {
        let errorSpy = _sinon.default.spy(console, 'error');

        stubSuccessfulUpload(server, 100);
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "MX80iLDO",
          "block": "{\"symbols\":[],\"statements\":[[4,\"gh-uploader\",null,[[\"files\"],[[25,[\"files\"]]]],{\"statements\":[],\"parameters\":[]},null]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)()]); // logs error because upload is in progress

        this.set('files', [(0, _fileUpload.createFile)()]);
        await (0, _testHelpers.settled)(); // runs ok because original upload has finished

        this.set('files', [(0, _fileUpload.createFile)()]);
        await (0, _testHelpers.settled)();
        (0, _chai.expect)(server.handledRequests.length).to.equal(2);
        (0, _chai.expect)(errorSpy.calledOnce).to.be.true;
        errorSpy.restore();
      });
      (0, _mocha.it)('yields isUploading whilst upload is in progress', async function () {
        stubSuccessfulUpload(server, 100);
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "PjuZrHgh",
          "block": "{\"symbols\":[\"uploader\"],\"statements\":[[0,\"\\n\"],[4,\"gh-uploader\",null,[[\"files\"],[[25,[\"files\"]]]],{\"statements\":[[4,\"if\",[[24,1,[\"isUploading\"]]],null,{\"statements\":[[0,\"                    \"],[7,\"div\"],[11,\"class\",\"is-uploading-test\"],[9],[10],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[1]},null]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)(), (0, _fileUpload.createFile)()]);
        await (0, _testHelpers.waitFor)('.is-uploading-test', {
          timeout: 100
        });
        await (0, _testHelpers.settled)();
        (0, _chai.expect)((0, _testHelpers.find)('.is-uploading-test')).to.not.exist;
      });
      (0, _mocha.it)('yields progressBar component with total upload progress', async function () {
        stubSuccessfulUpload(server, 100);
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "hPEEjuxk",
          "block": "{\"symbols\":[\"uploader\"],\"statements\":[[0,\"\\n\"],[4,\"gh-uploader\",null,[[\"files\"],[[25,[\"files\"]]]],{\"statements\":[[0,\"                \"],[1,[24,1,[\"progressBar\"]],false],[0,\"\\n\"]],\"parameters\":[1]},null]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)(), (0, _fileUpload.createFile)()]);
        await (0, _testHelpers.waitFor)('[data-test-progress-bar]', {
          timeout: 100
        });
        await (0, _testHelpers.waitFor)('[data-test-progress-width^="5"]', {
          timeout: 150
        });
        await (0, _testHelpers.settled)();
        let finalProgressWidth = parseInt((0, _testHelpers.find)('[data-test-progress-bar]').style.width);
        (0, _chai.expect)(finalProgressWidth, 'final progress width').to.equal(100);
      });
      (0, _mocha.it)('yields files property', async function () {
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "gl5+Ueur",
          "block": "{\"symbols\":[\"uploader\",\"file\"],\"statements\":[[0,\"\\n\"],[4,\"gh-uploader\",null,[[\"files\"],[[25,[\"files\"]]]],{\"statements\":[[4,\"each\",[[24,1,[\"files\"]]],null,{\"statements\":[[0,\"                    \"],[7,\"div\"],[11,\"class\",\"file\"],[9],[1,[24,2,[\"name\"]],false],[10],[0,\"\\n\"]],\"parameters\":[2]},null]],\"parameters\":[1]},null]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'file1.png'
        }), (0, _fileUpload.createFile)(['test'], {
          name: 'file2.png'
        })]);
        (0, _chai.expect)((0, _testHelpers.findAll)('.file')[0].textContent).to.equal('file1.png');
        (0, _chai.expect)((0, _testHelpers.findAll)('.file')[1].textContent).to.equal('file2.png');
      });
      (0, _mocha.it)('can be cancelled', async function () {
        stubSuccessfulUpload(server, 200);
        this.set('cancelled', _sinon.default.spy());
        this.set('complete', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "BdQWoa5O",
          "block": "{\"symbols\":[\"uploader\"],\"statements\":[[0,\"\\n\"],[4,\"gh-uploader\",null,[[\"files\",\"onCancel\"],[[25,[\"files\"]],[29,\"action\",[[24,0,[]],[25,[\"cancelled\"]]],null]]],{\"statements\":[[4,\"if\",[[24,1,[\"isUploading\"]]],null,{\"statements\":[[0,\"                    \"],[7,\"button\"],[11,\"class\",\"cancel-button\"],[9],[0,\"Cancel\"],[3,\"action\",[[24,0,[]],[24,1,[\"cancel\"]]]],[10],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[1]},null]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)()]);
        await (0, _testHelpers.waitFor)('.cancel-button');
        await (0, _testHelpers.click)('.cancel-button');
        (0, _chai.expect)(this.get('cancelled').calledOnce, 'onCancel triggered').to.be.true;
        (0, _chai.expect)(this.get('complete').notCalled, 'onComplete triggered').to.be.true;
      });
      (0, _mocha.it)('uploads to supplied `uploadUrl`', async function () {
        server.post('/ghost/api/v2/admin/images/', function () {
          return [200, {
            'Content-Type': 'application/json'
          }, '{"images": [{"url": "/content/images/test.png"}]'];
        });
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "CawDxHGf",
          "block": "{\"symbols\":[],\"statements\":[[4,\"gh-uploader\",null,[[\"files\",\"uploadUrl\"],[[25,[\"files\"]],\"/images/\"]],{\"statements\":[],\"parameters\":[]},null]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)()]);
        await (0, _testHelpers.settled)();

        let _server$handledReques2 = _slicedToArray(server.handledRequests, 1),
            lastRequest = _server$handledReques2[0];

        (0, _chai.expect)(lastRequest.url).to.equal('/ghost/api/v2/admin/images/');
      });
      (0, _mocha.it)('passes supplied paramName in request', async function () {
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "qtik0FOg",
          "block": "{\"symbols\":[],\"statements\":[[4,\"gh-uploader\",null,[[\"files\",\"paramName\"],[[25,[\"files\"]],\"testupload\"]],{\"statements\":[],\"parameters\":[]},null]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)()]);
        await (0, _testHelpers.settled)();

        let _server$handledReques3 = _slicedToArray(server.handledRequests, 1),
            lastRequest = _server$handledReques3[0]; // requestBody is a FormData object
        // this will fail in anything other than Chrome and Firefox
        // https://developer.mozilla.org/en-US/docs/Web/API/FormData#Browser_compatibility


        (0, _chai.expect)(lastRequest.requestBody.has('testupload')).to.be.true;
      });
    });
    (0, _mocha.describe)('validation', function () {
      (0, _mocha.it)('validates file extensions by default', async function () {
        this.set('onFailed', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "/OKxs4sh",
          "block": "{\"symbols\":[],\"statements\":[[0,\"\\n                \"],[4,\"gh-uploader\",null,[[\"files\",\"extensions\",\"onFailed\"],[[25,[\"files\"]],\"jpg,jpeg\",[29,\"action\",[[24,0,[]],[25,[\"onFailed\"]]],null]]],{\"statements\":[],\"parameters\":[]},null],[0,\"\\n            \"]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'test.png'
        })]);
        await (0, _testHelpers.settled)();

        let _this$get$firstCall$a = _slicedToArray(this.get('onFailed').firstCall.args, 1),
            onFailedResult = _this$get$firstCall$a[0];

        (0, _chai.expect)(onFailedResult.length).to.equal(1);
        (0, _chai.expect)(onFailedResult[0].fileName, 'onFailed file name').to.equal('test.png');
        (0, _chai.expect)(onFailedResult[0].message, 'onFailed message').to.match(/not supported/);
      });
      (0, _mocha.it)('accepts custom validation method', async function () {
        this.set('validate', function (file) {
          return "".concat(file.name, " failed test validation");
        });
        this.set('onFailed', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "HMZ7YjBv",
          "block": "{\"symbols\":[],\"statements\":[[0,\"\\n                \"],[4,\"gh-uploader\",null,[[\"files\",\"validate\",\"onFailed\"],[[25,[\"files\"]],[29,\"action\",[[24,0,[]],[25,[\"validate\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"onFailed\"]]],null]]],{\"statements\":[],\"parameters\":[]},null],[0,\"\\n            \"]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'test.png'
        })]);
        await (0, _testHelpers.settled)();

        let _this$get$firstCall$a2 = _slicedToArray(this.get('onFailed').firstCall.args, 1),
            onFailedResult = _this$get$firstCall$a2[0];

        (0, _chai.expect)(onFailedResult.length).to.equal(1);
        (0, _chai.expect)(onFailedResult[0].fileName).to.equal('test.png');
        (0, _chai.expect)(onFailedResult[0].message).to.equal('test.png failed test validation');
      });
      (0, _mocha.it)('yields errors when validation fails', async function () {
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "2SsXtXKX",
          "block": "{\"symbols\":[\"uploader\",\"error\"],\"statements\":[[0,\"\\n\"],[4,\"gh-uploader\",null,[[\"files\",\"extensions\"],[[25,[\"files\"]],\"jpg,jpeg\"]],{\"statements\":[[4,\"each\",[[24,1,[\"errors\"]]],null,{\"statements\":[[0,\"                        \"],[7,\"div\"],[11,\"class\",\"error-fileName\"],[9],[1,[24,2,[\"fileName\"]],false],[10],[0,\"\\n                        \"],[7,\"div\"],[11,\"class\",\"error-message\"],[9],[1,[24,2,[\"message\"]],false],[10],[0,\"\\n\"]],\"parameters\":[2]},null]],\"parameters\":[1]},null],[0,\"            \"]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'test.png'
        })]);
        await (0, _testHelpers.settled)();
        (0, _chai.expect)((0, _testHelpers.find)('.error-fileName').textContent).to.equal('test.png');
        (0, _chai.expect)((0, _testHelpers.find)('.error-message').textContent).to.match(/not supported/);
      });
    });
    (0, _mocha.describe)('server errors', function () {
      beforeEach(function () {
        stubFailedUpload(server, 500, 'No upload for you');
      });
      (0, _mocha.it)('triggers onFailed when uploads complete', async function () {
        this.set('uploadFailed', _sinon.default.spy());
        this.set('uploadComplete', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "5S/pBmxL",
          "block": "{\"symbols\":[],\"statements\":[[0,\"\\n\"],[4,\"gh-uploader\",null,[[\"files\",\"onFailed\",\"onComplete\"],[[25,[\"files\"]],[29,\"action\",[[24,0,[]],[25,[\"uploadFailed\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"uploadComplete\"]]],null]]],{\"statements\":[],\"parameters\":[]},null],[0,\"            \"]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'file1.png'
        }), (0, _fileUpload.createFile)(['test'], {
          name: 'file2.png'
        })]);
        await (0, _testHelpers.settled)();
        (0, _chai.expect)(this.get('uploadFailed').calledOnce).to.be.true;
        (0, _chai.expect)(this.get('uploadComplete').calledOnce).to.be.true;

        let _this$get$firstCall$a3 = _slicedToArray(this.get('uploadFailed').firstCall.args, 1),
            failures = _this$get$firstCall$a3[0];

        (0, _chai.expect)(failures.length).to.equal(2);
        (0, _chai.expect)(failures[0].fileName).to.equal('file1.png');
        (0, _chai.expect)(failures[0].message).to.equal('Error: No upload for you');
      });
      (0, _mocha.it)('triggers onUploadFailure when each upload fails', async function () {
        this.set('uploadFail', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "quete0vH",
          "block": "{\"symbols\":[],\"statements\":[[0,\"\\n\"],[4,\"gh-uploader\",null,[[\"files\",\"onUploadFailure\"],[[25,[\"files\"]],[29,\"action\",[[24,0,[]],[25,[\"uploadFail\"]]],null]]],{\"statements\":[],\"parameters\":[]},null],[0,\"            \"]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'file1.png'
        }), (0, _fileUpload.createFile)(['test'], {
          name: 'file2.png'
        })]);
        await (0, _testHelpers.settled)();
        (0, _chai.expect)(this.get('uploadFail').calledTwice).to.be.true;

        let _this$get$firstCall$a4 = _slicedToArray(this.get('uploadFail').firstCall.args, 1),
            firstFailure = _this$get$firstCall$a4[0];

        (0, _chai.expect)(firstFailure.fileName).to.equal('file1.png');
        (0, _chai.expect)(firstFailure.message).to.equal('Error: No upload for you');

        let _this$get$secondCall$ = _slicedToArray(this.get('uploadFail').secondCall.args, 1),
            secondFailure = _this$get$secondCall$[0];

        (0, _chai.expect)(secondFailure.fileName).to.equal('file2.png');
        (0, _chai.expect)(secondFailure.message).to.equal('Error: No upload for you');
      });
      (0, _mocha.it)('yields errors when uploads fail', async function () {
        await (0, _testHelpers.render)(Ember.HTMLBars.template({
          "id": "1cqLKxEG",
          "block": "{\"symbols\":[\"uploader\",\"error\"],\"statements\":[[0,\"\\n\"],[4,\"gh-uploader\",null,[[\"files\"],[[25,[\"files\"]]]],{\"statements\":[[4,\"each\",[[24,1,[\"errors\"]]],null,{\"statements\":[[0,\"                        \"],[7,\"div\"],[11,\"class\",\"error-fileName\"],[9],[1,[24,2,[\"fileName\"]],false],[10],[0,\"\\n                        \"],[7,\"div\"],[11,\"class\",\"error-message\"],[9],[1,[24,2,[\"message\"]],false],[10],[0,\"\\n\"]],\"parameters\":[2]},null]],\"parameters\":[1]},null],[0,\"            \"]],\"hasEval\":false}",
          "meta": {}
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'test.png'
        })]);
        await (0, _testHelpers.settled)();
        (0, _chai.expect)((0, _testHelpers.find)('.error-fileName').textContent).to.equal('test.png');
        (0, _chai.expect)((0, _testHelpers.find)('.error-message').textContent).to.equal('Error: No upload for you');
      });
    });
  });
});
define("ghost-admin/tests/integration/components/gh-validation-status-container-test", ["ember-data", "mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_emberData, _mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  const Errors = _emberData.default.Errors;
  (0, _mocha.describe)('Integration: Component: gh-validation-status-container', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      let testObject = Ember.Object.create();
      testObject.set('name', 'Test');
      testObject.set('hasValidated', []);
      testObject.set('errors', Errors.create());
      this.set('testObject', testObject);
    });
    (0, _mocha.it)('has no success/error class by default', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "90aRh9Ay",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n\"],[4,\"gh-validation-status-container\",null,[[\"class\",\"property\",\"errors\",\"hasValidated\"],[\"gh-test\",\"name\",[25,[\"testObject\",\"errors\"]],[25,[\"testObject\",\"hasValidated\"]]]],{\"statements\":[],\"parameters\":[]},null],[0,\"        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.not.have.class('success');
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.not.have.class('error');
    });
    (0, _mocha.it)('has success class when valid', async function () {
      this.get('testObject.hasValidated').push('name');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "90aRh9Ay",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n\"],[4,\"gh-validation-status-container\",null,[[\"class\",\"property\",\"errors\",\"hasValidated\"],[\"gh-test\",\"name\",[25,[\"testObject\",\"errors\"]],[25,[\"testObject\",\"hasValidated\"]]]],{\"statements\":[],\"parameters\":[]},null],[0,\"        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.have.class('success');
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.not.have.class('error');
    });
    (0, _mocha.it)('has error class when invalid', async function () {
      this.get('testObject.hasValidated').push('name');
      this.get('testObject.errors').add('name', 'has error');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "90aRh9Ay",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n\"],[4,\"gh-validation-status-container\",null,[[\"class\",\"property\",\"errors\",\"hasValidated\"],[\"gh-test\",\"name\",[25,[\"testObject\",\"errors\"]],[25,[\"testObject\",\"hasValidated\"]]]],{\"statements\":[],\"parameters\":[]},null],[0,\"        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.not.have.class('success');
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.have.class('error');
    });
    (0, _mocha.it)('still renders if hasValidated is undefined', async function () {
      this.set('testObject.hasValidated', undefined);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "90aRh9Ay",
        "block": "{\"symbols\":[],\"statements\":[[0,\"\\n\"],[4,\"gh-validation-status-container\",null,[[\"class\",\"property\",\"errors\",\"hasValidated\"],[\"gh-test\",\"name\",[25,[\"testObject\",\"errors\"]],[25,[\"testObject\",\"hasValidated\"]]]],{\"statements\":[],\"parameters\":[]},null],[0,\"        \"]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.exist;
    });
  });
});
define("ghost-admin/tests/integration/components/modal-transfer-owner-test", ["sinon", "@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_sinon, _testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: modal-transfer-owner', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('triggers confirm action', async function () {
      let confirm = _sinon.default.stub();

      let closeModal = _sinon.default.spy();

      confirm.returns(Ember.RSVP.resolve({}));
      this.set('confirm', confirm);
      this.set('closeModal', closeModal);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "pNdlkQ8Q",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"modal-transfer-owner\",null,[[\"confirm\",\"closeModal\"],[[29,\"action\",[[24,0,[]],[25,[\"confirm\"]]],null],[29,\"action\",[[24,0,[]],[25,[\"closeModal\"]]],null]]]],false]],\"hasEval\":false}",
        "meta": {}
      }));
      await (0, _testHelpers.click)('.gh-btn.gh-btn-red');
      (0, _chai.expect)(confirm.calledOnce, 'confirm called').to.be.true;
      (0, _chai.expect)(closeModal.calledOnce, 'closeModal called').to.be.true;
    });
  });
});
define("ghost-admin/tests/integration/helpers/background-image-style-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Helper: background-image-style', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "dKTSW2Cn",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"background-image-style\",[\"test.png\"],null],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text('background-image: url(test.png);');
    });
    (0, _mocha.it)('escapes URLs', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "FilfC/rk",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"background-image-style\",[\"test image.png\"],null],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text('background-image: url(test%20image.png);');
    });
    (0, _mocha.it)('handles already escaped URLs', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "KMmq5O6A",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"background-image-style\",[\"test%20image.png\"],null],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text('background-image: url(test%20image.png);');
    });
    (0, _mocha.it)('handles empty URLs', async function () {
      this.set('testImage', undefined);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "YVQh6zP5",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"background-image-style\",[[25,[\"testImage\"]]],null],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)(this.element, 'undefined').to.have.trimmed.text('');
      this.set('testImage', null);
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "YVQh6zP5",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"background-image-style\",[[25,[\"testImage\"]]],null],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)(this.element, 'null').to.have.trimmed.text('');
      this.set('testImage', '');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "YVQh6zP5",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"background-image-style\",[[25,[\"testImage\"]]],null],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)(this.element, 'blank').to.have.trimmed.text('');
    });
  });
});
define("ghost-admin/tests/integration/helpers/clean-basic-html-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Helper: clean-basic-html', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders', async function () {
      this.set('inputValue', '1234');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "X92PlVS1",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"clean-basic-html\",[[25,[\"inputValue\"]]],null],false]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text('1234');
    });
  });
});
define("ghost-admin/tests/integration/helpers/sanitize-html-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Helper: sanitize-html', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders html', async function () {
      this.set('inputValue', '<strong>bold</strong>');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "vwt4yinG",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"sanitize-html\",[[25,[\"inputValue\"]]],null],true]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.html('<strong>bold</strong>');
    });
    (0, _mocha.it)('replaces scripts', async function () {
      this.set('inputValue', '<script></script>');
      await (0, _testHelpers.render)(Ember.HTMLBars.template({
        "id": "vwt4yinG",
        "block": "{\"symbols\":[],\"statements\":[[1,[29,\"sanitize-html\",[[25,[\"inputValue\"]]],null],true]],\"hasEval\":false}",
        "meta": {}
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.html('<pre class="js-embed-placeholder">Embedded JavaScript</pre>');
    });
  });
});
define("ghost-admin/tests/integration/services/ajax-test", ["pretender", "ghost-admin/config/environment", "mocha", "chai", "ember-ajax/errors", "ghost-admin/services/ajax", "ember-mocha"], function (_pretender, _environment, _mocha, _chai, _errors, _ajax, _emberMocha) {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  function stubAjaxEndpoint(server) {
    let response = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let code = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 200;
    server.get('/test/', function () {
      return [code, {
        'Content-Type': 'application/json'
      }, JSON.stringify(response)];
    });
  }

  (0, _mocha.describe)('Integration: Service: ajax', function () {
    (0, _emberMocha.setupTest)('service:ajax', {
      integration: true
    });
    let server;
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('adds Ghost version header to requests', function (done) {
      let version = _environment.default.APP.version;
      let ajax = this.subject();
      stubAjaxEndpoint(server, {});
      ajax.request('/test/').then(() => {
        let _server$handledReques = _slicedToArray(server.handledRequests, 1),
            request = _server$handledReques[0];

        (0, _chai.expect)(request.requestHeaders['X-Ghost-Version']).to.equal(version);
        done();
      });
    });
    (0, _mocha.it)('correctly parses single message response text', function (done) {
      let error = {
        message: 'Test Error'
      };
      stubAjaxEndpoint(server, error, 500);
      let ajax = this.subject();
      ajax.request('/test/').then(() => {
        (0, _chai.expect)(false).to.be.true();
      }).catch(error => {
        (0, _chai.expect)(error.payload.errors.length).to.equal(1);
        (0, _chai.expect)(error.payload.errors[0].message).to.equal('Test Error');
        done();
      });
    });
    (0, _mocha.it)('correctly parses single error response text', function (done) {
      let error = {
        error: 'Test Error'
      };
      stubAjaxEndpoint(server, error, 500);
      let ajax = this.subject();
      ajax.request('/test/').then(() => {
        (0, _chai.expect)(false).to.be.true();
      }).catch(error => {
        (0, _chai.expect)(error.payload.errors.length).to.equal(1);
        (0, _chai.expect)(error.payload.errors[0].message).to.equal('Test Error');
        done();
      });
    });
    (0, _mocha.it)('correctly parses multiple error messages', function (done) {
      let error = {
        errors: ['First Error', 'Second Error']
      };
      stubAjaxEndpoint(server, error, 500);
      let ajax = this.subject();
      ajax.request('/test/').then(() => {
        (0, _chai.expect)(false).to.be.true();
      }).catch(error => {
        (0, _chai.expect)(error.payload.errors.length).to.equal(2);
        (0, _chai.expect)(error.payload.errors[0].message).to.equal('First Error');
        (0, _chai.expect)(error.payload.errors[1].message).to.equal('Second Error');
        done();
      });
    });
    (0, _mocha.it)('returns default error object for non built-in error', function (done) {
      stubAjaxEndpoint(server, {}, 500);
      let ajax = this.subject();
      ajax.request('/test/').then(() => {
        (0, _chai.expect)(false).to.be.true;
      }).catch(error => {
        (0, _chai.expect)((0, _errors.isAjaxError)(error)).to.be.true;
        done();
      });
    });
    (0, _mocha.it)('handles error checking for built-in errors', function (done) {
      stubAjaxEndpoint(server, '', 401);
      let ajax = this.subject();
      ajax.request('/test/').then(() => {
        (0, _chai.expect)(false).to.be.true;
      }).catch(error => {
        (0, _chai.expect)((0, _errors.isUnauthorizedError)(error)).to.be.true;
        done();
      });
    });
    (0, _mocha.it)('handles error checking for VersionMismatchError', function (done) {
      server.get('/test/', function () {
        return [400, {
          'Content-Type': 'application/json'
        }, JSON.stringify({
          errors: [{
            type: 'VersionMismatchError',
            statusCode: 400
          }]
        })];
      });
      let ajax = this.subject();
      ajax.request('/test/').then(() => {
        (0, _chai.expect)(false).to.be.true;
      }).catch(error => {
        (0, _chai.expect)((0, _ajax.isVersionMismatchError)(error)).to.be.true;
        done();
      });
    });
    (0, _mocha.it)('handles error checking for RequestEntityTooLargeError on 413 errors', function (done) {
      stubAjaxEndpoint(server, {}, 413);
      let ajax = this.subject();
      ajax.request('/test/').then(() => {
        (0, _chai.expect)(false).to.be.true;
      }).catch(error => {
        (0, _chai.expect)((0, _ajax.isRequestEntityTooLargeError)(error)).to.be.true;
        done();
      });
    });
    (0, _mocha.it)('handles error checking for UnsupportedMediaTypeError on 415 errors', function (done) {
      stubAjaxEndpoint(server, {}, 415);
      let ajax = this.subject();
      ajax.request('/test/').then(() => {
        (0, _chai.expect)(false).to.be.true;
      }).catch(error => {
        (0, _chai.expect)((0, _ajax.isUnsupportedMediaTypeError)(error)).to.be.true;
        done();
      });
    });
    (0, _mocha.it)('handles error checking for MaintenanceError on 503 errors', function (done) {
      stubAjaxEndpoint(server, {}, 503);
      let ajax = this.subject();
      ajax.request('/test/').then(() => {
        (0, _chai.expect)(false).to.be.true;
      }).catch(error => {
        (0, _chai.expect)((0, _ajax.isMaintenanceError)(error)).to.be.true;
        done();
      });
    });
  });
});
define("ghost-admin/tests/integration/services/config-test", ["pretender", "ember-test-helpers/wait", "mocha", "chai", "ember-mocha"], function (_pretender, _wait, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Service: config', function () {
    (0, _emberMocha.setupTest)('service:config', {
      integration: true
    });
    let server;
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('returns a list of timezones in the expected format', function (done) {
      let service = this.subject();
      service.get('availableTimezones').then(function (timezones) {
        (0, _chai.expect)(timezones.length).to.equal(66);
        (0, _chai.expect)(timezones[0].name).to.equal('Pacific/Pago_Pago');
        (0, _chai.expect)(timezones[0].label).to.equal('(GMT -11:00) Midway Island, Samoa');
        (0, _chai.expect)(timezones[1].name).to.equal('Pacific/Honolulu');
        (0, _chai.expect)(timezones[1].label).to.equal('(GMT -10:00) Hawaii');
        done();
      });
    });
    (0, _mocha.it)('normalizes blogUrl to non-trailing-slash', function (done) {
      let stubBlogUrl = function stubBlogUrl(url) {
        server.get('/ghost/api/v2/admin/config/', function () {
          return [200, {
            'Content-Type': 'application/json'
          }, JSON.stringify({})];
        });
        server.get('/ghost/api/v2/admin/site/', function () {
          return [200, {
            'Content-Type': 'application/json'
          }, JSON.stringify({
            site: {
              url
            }
          })];
        });
      };

      let service = this.subject();
      stubBlogUrl('http://localhost:2368/');
      service.fetch().then(() => {
        (0, _chai.expect)(service.get('blogUrl'), 'trailing-slash').to.equal('http://localhost:2368');
      });
      (0, _wait.default)().then(() => {
        stubBlogUrl('http://localhost:2368');
        service.fetch().then(() => {
          (0, _chai.expect)(service.get('blogUrl'), 'non-trailing-slash').to.equal('http://localhost:2368');
          done();
        });
      });
    });
  });
});
define("ghost-admin/tests/integration/services/feature-test", ["ghost-admin/services/feature", "pretender", "ember-test-helpers/wait", "mocha", "chai", "ember-mocha"], function (_feature, _pretender, _wait, _mocha, _chai, _emberMocha) {
  "use strict";

  function stubSettings(server, labs) {
    let validSave = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    let settings = [{
      id: '1',
      type: 'blog',
      key: 'labs',
      value: JSON.stringify(labs)
    }];
    server.get('/ghost/api/v2/admin/settings/', function () {
      return [200, {
        'Content-Type': 'application/json'
      }, JSON.stringify({
        settings
      })];
    });
    server.put('/ghost/api/v2/admin/settings/', function (request) {
      let statusCode = validSave ? 200 : 400;
      let response = validSave ? request.requestBody : JSON.stringify({
        errors: [{
          message: 'Test Error'
        }]
      });
      return [statusCode, {
        'Content-Type': 'application/json'
      }, response];
    });
  }

  function stubUser(server, accessibility) {
    let validSave = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    let users = [{
      id: '1',
      // Add extra properties for the validations
      name: 'Test User',
      email: 'test@example.com',
      accessibility: JSON.stringify(accessibility),
      roles: [{
        id: 1,
        name: 'Owner',
        description: 'Owner'
      }]
    }];
    server.get('/ghost/api/v2/admin/users/me/', function () {
      return [200, {
        'Content-Type': 'application/json'
      }, JSON.stringify({
        users
      })];
    });
    server.put('/ghost/api/v2/admin/users/1/', function (request) {
      let statusCode = validSave ? 200 : 400;
      let response = validSave ? request.requestBody : JSON.stringify({
        errors: [{
          message: 'Test Error'
        }]
      });
      return [statusCode, {
        'Content-Type': 'application/json'
      }, response];
    });
  }

  function addTestFlag() {
    _feature.default.reopen({
      testFlag: (0, _feature.feature)('testFlag'),
      testUserFlag: (0, _feature.feature)('testUserFlag', {
        user: true
      })
    });
  }

  (0, _mocha.describe)('Integration: Service: feature', function () {
    (0, _emberMocha.setupTest)('service:feature', {
      integration: true
    });
    let server;
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('loads labs and user settings correctly', function () {
      stubSettings(server, {
        testFlag: true
      });
      stubUser(server, {
        testUserFlag: true
      });
      addTestFlag();
      let service = this.subject();
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('testFlag')).to.be.true;
        (0, _chai.expect)(service.get('testUserFlag')).to.be.true;
      });
    });
    (0, _mocha.it)('returns false for set flag with config false and labs false', function () {
      stubSettings(server, {
        testFlag: false
      });
      stubUser(server, {});
      addTestFlag();
      let service = this.subject();
      service.get('config').set('testFlag', false);
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('labs.testFlag')).to.be.false;
        (0, _chai.expect)(service.get('testFlag')).to.be.false;
      });
    });
    (0, _mocha.it)('returns true for set flag with config true and labs false', function () {
      stubSettings(server, {
        testFlag: false
      });
      stubUser(server, {});
      addTestFlag();
      let service = this.subject();
      service.get('config').set('testFlag', true);
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('labs.testFlag')).to.be.false;
        (0, _chai.expect)(service.get('testFlag')).to.be.true;
      });
    });
    (0, _mocha.it)('returns true for set flag with config false and labs true', function () {
      stubSettings(server, {
        testFlag: true
      });
      stubUser(server, {});
      addTestFlag();
      let service = this.subject();
      service.get('config').set('testFlag', false);
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('labs.testFlag')).to.be.true;
        (0, _chai.expect)(service.get('testFlag')).to.be.true;
      });
    });
    (0, _mocha.it)('returns true for set flag with config true and labs true', function () {
      stubSettings(server, {
        testFlag: true
      });
      stubUser(server, {});
      addTestFlag();
      let service = this.subject();
      service.get('config').set('testFlag', true);
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('labs.testFlag')).to.be.true;
        (0, _chai.expect)(service.get('testFlag')).to.be.true;
      });
    });
    (0, _mocha.it)('returns false for set flag with accessibility false', function () {
      stubSettings(server, {});
      stubUser(server, {
        testUserFlag: false
      });
      addTestFlag();
      let service = this.subject();
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('accessibility.testUserFlag')).to.be.false;
        (0, _chai.expect)(service.get('testUserFlag')).to.be.false;
      });
    });
    (0, _mocha.it)('returns true for set flag with accessibility true', function () {
      stubSettings(server, {});
      stubUser(server, {
        testUserFlag: true
      });
      addTestFlag();
      let service = this.subject();
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('accessibility.testUserFlag')).to.be.true;
        (0, _chai.expect)(service.get('testUserFlag')).to.be.true;
      });
    });
    (0, _mocha.it)('saves labs setting correctly', function () {
      stubSettings(server, {
        testFlag: false
      });
      stubUser(server, {
        testUserFlag: false
      });
      addTestFlag();
      let service = this.subject();
      service.get('config').set('testFlag', false);
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('testFlag')).to.be.false;
        Ember.run(() => {
          service.set('testFlag', true);
        });
        return (0, _wait.default)().then(() => {
          (0, _chai.expect)(server.handlers[1].numberOfCalls).to.equal(1);
          (0, _chai.expect)(service.get('testFlag')).to.be.true;
        });
      });
    });
    (0, _mocha.it)('saves accessibility setting correctly', function () {
      stubSettings(server, {});
      stubUser(server, {
        testUserFlag: false
      });
      addTestFlag();
      let service = this.subject();
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('testUserFlag')).to.be.false;
        Ember.run(() => {
          service.set('testUserFlag', true);
        });
        return (0, _wait.default)().then(() => {
          (0, _chai.expect)(server.handlers[3].numberOfCalls).to.equal(1);
          (0, _chai.expect)(service.get('testUserFlag')).to.be.true;
        });
      });
    });
    (0, _mocha.it)('notifies for server errors on labs save', function () {
      stubSettings(server, {
        testFlag: false
      }, false);
      stubUser(server, {});
      addTestFlag();
      let service = this.subject();
      service.get('config').set('testFlag', false);
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('testFlag')).to.be.false;
        Ember.run(() => {
          service.set('testFlag', true);
        });
        return (0, _wait.default)().then(() => {
          (0, _chai.expect)(server.handlers[1].numberOfCalls, 'PUT call is made').to.equal(1);
          (0, _chai.expect)(service.get('notifications.alerts').length, 'number of alerts shown').to.equal(1);
          (0, _chai.expect)(service.get('testFlag')).to.be.false;
        });
      });
    });
    (0, _mocha.it)('notifies for server errors on accessibility save', function () {
      stubSettings(server, {});
      stubUser(server, {
        testUserFlag: false
      }, false);
      addTestFlag();
      let service = this.subject();
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('testUserFlag')).to.be.false;
        Ember.run(() => {
          service.set('testUserFlag', true);
        });
        return (0, _wait.default)().then(() => {
          (0, _chai.expect)(server.handlers[3].numberOfCalls, 'PUT call is made').to.equal(1);
          (0, _chai.expect)(service.get('notifications.alerts').length, 'number of alerts shown').to.equal(1);
          (0, _chai.expect)(service.get('testUserFlag')).to.be.false;
        });
      });
    });
    (0, _mocha.it)('notifies for validation errors', function () {
      stubSettings(server, {
        testFlag: false
      }, true, false);
      stubUser(server, {});
      addTestFlag();
      let service = this.subject();
      service.get('config').set('testFlag', false);
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('testFlag')).to.be.false;
        Ember.run(() => {
          (0, _chai.expect)(() => {
            service.set('testFlag', true);
          }, Ember.Error, 'threw validation error');
        });
        return (0, _wait.default)().then(() => {
          // ensure validation is happening before the API is hit
          (0, _chai.expect)(server.handlers[1].numberOfCalls).to.equal(0);
          (0, _chai.expect)(service.get('testFlag')).to.be.false;
        });
      });
    });
  });
});
define("ghost-admin/tests/integration/services/lazy-loader-test", ["jquery", "pretender", "mocha", "chai", "ember-mocha"], function (_jquery, _pretender, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Service: lazy-loader', function () {
    (0, _emberMocha.setupTest)('service:lazy-loader', {
      integration: true
    });
    let server;
    let ghostPaths = {
      adminRoot: '/assets/'
    };
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('loads a script correctly and only once', async function () {
      let subject = this.subject({
        ghostPaths,
        scriptPromises: {},
        testing: false
      }); // first load should add script element

      await subject.loadScript('test', 'lazy-test.js').then(() => {}).catch(() => {});
      (0, _chai.expect)(document.querySelectorAll('script[src="/assets/lazy-test.js"]').length, 'no of script tags on first load').to.equal(1); // second load should not add another script element

      await subject.loadScript('test', '/assets/lazy-test.js').then(() => {}).catch(() => {});
      (0, _chai.expect)(document.querySelectorAll('script[src="/assets/lazy-test.js"]').length, 'no of script tags on second load').to.equal(1);
    });
    (0, _mocha.it)('loads styles correctly', function () {
      let subject = this.subject({
        ghostPaths,
        testing: false
      });
      return subject.loadStyle('testing', 'style.css').catch(() => {
        // we add a catch handler here because `/assets/style.css` doesn't exist
        (0, _chai.expect)((0, _jquery.default)('#testing-styles').length).to.equal(1);
        (0, _chai.expect)((0, _jquery.default)('#testing-styles').attr('href')).to.equal('/assets/style.css');
      });
    });
  });
});
define("ghost-admin/tests/integration/services/slug-generator-test", ["pretender", "mocha", "chai", "ember-mocha"], function (_pretender, _mocha, _chai, _emberMocha) {
  "use strict";

  function stubSlugEndpoint(server, type, slug) {
    server.get('/ghost/api/v2/admin/slugs/:type/:slug/', function (request) {
      (0, _chai.expect)(request.params.type).to.equal(type);
      (0, _chai.expect)(request.params.slug).to.equal(slug);
      return [200, {
        'Content-Type': 'application/json'
      }, JSON.stringify({
        slugs: [{
          slug: Ember.String.dasherize(slug)
        }]
      })];
    });
  }

  (0, _mocha.describe)('Integration: Service: slug-generator', function () {
    (0, _emberMocha.setupTest)('service:slug-generator', {
      integration: true
    });
    let server;
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('returns empty if no slug is provided', function (done) {
      let service = this.subject();
      service.generateSlug('post', '').then(function (slug) {
        (0, _chai.expect)(slug).to.equal('');
        done();
      });
    });
    (0, _mocha.it)('calls correct endpoint and returns correct data', function (done) {
      let rawSlug = 'a test post';
      stubSlugEndpoint(server, 'post', rawSlug);
      let service = this.subject();
      service.generateSlug('post', rawSlug).then(function (slug) {
        (0, _chai.expect)(slug).to.equal(Ember.String.dasherize(rawSlug));
        done();
      });
    });
  });
});
define("ghost-admin/tests/integration/services/store-test", ["pretender", "ghost-admin/config/environment", "mocha", "chai", "ember-mocha"], function (_pretender, _environment, _mocha, _chai, _emberMocha) {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  (0, _mocha.describe)('Integration: Service: store', function () {
    (0, _emberMocha.setupTest)('service:store', {
      integration: true
    });
    let server;
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('adds Ghost version header to requests', function (done) {
      let version = _environment.default.APP.version;
      let store = this.subject();
      server.get('/ghost/api/v2/admin/posts/1/', function () {
        return [404, {
          'Content-Type': 'application/json'
        }, JSON.stringify({})];
      });
      store.find('post', 1).catch(() => {
        let _server$handledReques = _slicedToArray(server.handledRequests, 1),
            request = _server$handledReques[0];

        (0, _chai.expect)(request.requestHeaders['X-Ghost-Version']).to.equal(version);
        done();
      });
    });
  });
});
define("ghost-admin/tests/lint/app.lint-test", [], function () {
  "use strict";

  describe('ESLint | app', function () {
    it('adapters/application.js', function () {// test passed
    });
    it('adapters/base.js', function () {// test passed
    });
    it('adapters/embedded-relation-adapter.js', function () {// test passed
    });
    it('adapters/page.js', function () {// test passed
    });
    it('adapters/post.js', function () {// test passed
    });
    it('adapters/setting.js', function () {// test passed
    });
    it('adapters/tag.js', function () {// test passed
    });
    it('adapters/theme.js', function () {// test passed
    });
    it('adapters/user.js', function () {// test passed
    });
    it('app.js', function () {// test passed
    });
    it('authenticators/cookie.js', function () {// test passed
    });
    it('components/aspect-ratio-box.js', function () {// test passed
    });
    it('components/gh-activating-list-item.js', function () {// test passed
    });
    it('components/gh-alert.js', function () {// test passed
    });
    it('components/gh-alerts.js', function () {// test passed
    });
    it('components/gh-app.js', function () {// test passed
    });
    it('components/gh-basic-dropdown.js', function () {// test passed
    });
    it('components/gh-blog-url.js', function () {// test passed
    });
    it('components/gh-cm-editor.js', function () {// test passed
    });
    it('components/gh-content-cover.js', function () {// test passed
    });
    it('components/gh-date-time-picker.js', function () {// test passed
    });
    it('components/gh-download-count.js', function () {// test passed
    });
    it('components/gh-dropdown-button.js', function () {// test passed
    });
    it('components/gh-dropdown.js', function () {// test passed
    });
    it('components/gh-editor-post-status.js', function () {// test passed
    });
    it('components/gh-editor.js', function () {// test passed
    });
    it('components/gh-error-message.js', function () {// test passed
    });
    it('components/gh-feature-flag.js', function () {// test passed
    });
    it('components/gh-file-input.js', function () {// test passed
    });
    it('components/gh-file-upload.js', function () {// test passed
    });
    it('components/gh-file-uploader.js', function () {// test passed
    });
    it('components/gh-form-group.js', function () {// test passed
    });
    it('components/gh-fullscreen-modal.js', function () {// test passed
    });
    it('components/gh-image-uploader-with-preview.js', function () {// test passed
    });
    it('components/gh-image-uploader.js', function () {// test passed
    });
    it('components/gh-infinity-loader.js', function () {// test passed
    });
    it('components/gh-koenig-editor.js', function () {// test passed
    });
    it('components/gh-loading-spinner.js', function () {// test passed
    });
    it('components/gh-main.js', function () {// test passed
    });
    it('components/gh-markdown-editor.js', function () {// test passed
    });
    it('components/gh-member-avatar.js', function () {// test passed
    });
    it('components/gh-mobile-nav-bar.js', function () {// test passed
    });
    it('components/gh-nav-menu.js', function () {// test passed
    });
    it('components/gh-navitem-url-input.js', function () {// test passed
    });
    it('components/gh-navitem.js', function () {// test passed
    });
    it('components/gh-notification.js', function () {// test passed
    });
    it('components/gh-notifications.js', function () {// test passed
    });
    it('components/gh-post-settings-menu.js', function () {// test passed
    });
    it('components/gh-posts-list-item.js', function () {// test passed
    });
    it('components/gh-profile-image.js', function () {// test passed
    });
    it('components/gh-progress-bar.js', function () {// test passed
    });
    it('components/gh-psm-authors-input.js', function () {// test passed
    });
    it('components/gh-psm-tags-input.js', function () {// test passed
    });
    it('components/gh-psm-template-select.js', function () {// test passed
    });
    it('components/gh-publishmenu-draft.js', function () {// test passed
    });
    it('components/gh-publishmenu-published.js', function () {// test passed
    });
    it('components/gh-publishmenu-scheduled.js', function () {// test passed
    });
    it('components/gh-publishmenu.js', function () {// test passed
    });
    it('components/gh-scheduled-post-countdown.js', function () {// test passed
    });
    it('components/gh-scroll-trigger.js', function () {// test passed
    });
    it('components/gh-search-input-trigger.js', function () {// test passed
    });
    it('components/gh-search-input.js', function () {// test passed
    });
    it('components/gh-simplemde.js', function () {// test passed
    });
    it('components/gh-site-iframe.js', function () {// test passed
    });
    it('components/gh-skip-link.js', function () {// test passed
    });
    it('components/gh-subscribers-table.js', function () {// test passed
    });
    it('components/gh-tag-settings-form.js', function () {// test passed
    });
    it('components/gh-tag.js', function () {// test passed
    });
    it('components/gh-tags-management-container.js', function () {// test passed
    });
    it('components/gh-task-button.js', function () {// test passed
    });
    it('components/gh-text-input.js', function () {// test passed
    });
    it('components/gh-textarea.js', function () {// test passed
    });
    it('components/gh-theme-error-li.js', function () {// test passed
    });
    it('components/gh-theme-table.js', function () {// test passed
    });
    it('components/gh-timezone-select.js', function () {// test passed
    });
    it('components/gh-token-input.js', function () {// test passed
    });
    it('components/gh-token-input/select-multiple.js', function () {// test passed
    });
    it('components/gh-token-input/select.js', function () {// test passed
    });
    it('components/gh-token-input/suggested-option.js', function () {// test passed
    });
    it('components/gh-token-input/tag-token.js', function () {// test passed
    });
    it('components/gh-token-input/trigger.js', function () {// test passed
    });
    it('components/gh-tour-item.js', function () {// test passed
    });
    it('components/gh-trim-focus-input.js', function () {// test passed
    });
    it('components/gh-unsplash-photo.js', function () {// test passed
    });
    it('components/gh-unsplash.js', function () {// test passed
    });
    it('components/gh-uploader.js', function () {// test passed
    });
    it('components/gh-url-preview.js', function () {// test passed
    });
    it('components/gh-user-active.js', function () {// test passed
    });
    it('components/gh-user-invited.js', function () {// test passed
    });
    it('components/gh-user-list-item.js', function () {// test passed
    });
    it('components/gh-validation-status-container.js', function () {// test passed
    });
    it('components/gh-view-title.js', function () {// test passed
    });
    it('components/infinity-loader.js', function () {// test passed
    });
    it('components/modal-base.js', function () {// test passed
    });
    it('components/modal-delete-all.js', function () {// test passed
    });
    it('components/modal-delete-integration.js', function () {// test passed
    });
    it('components/modal-delete-member.js', function () {// test passed
    });
    it('components/modal-delete-post.js', function () {// test passed
    });
    it('components/modal-delete-subscriber.js', function () {// test passed
    });
    it('components/modal-delete-tag.js', function () {// test passed
    });
    it('components/modal-delete-theme.js', function () {// test passed
    });
    it('components/modal-delete-user.js', function () {// test passed
    });
    it('components/modal-delete-webhook.js', function () {// test passed
    });
    it('components/modal-import-subscribers.js', function () {// test passed
    });
    it('components/modal-invite-new-user.js', function () {// test passed
    });
    it('components/modal-leave-editor.js', function () {// test passed
    });
    it('components/modal-leave-settings.js', function () {// test passed
    });
    it('components/modal-markdown-help.js', function () {// test passed
    });
    it('components/modal-new-integration.js', function () {// test passed
    });
    it('components/modal-new-subscriber.js', function () {// test passed
    });
    it('components/modal-re-authenticate.js', function () {// test passed
    });
    it('components/modal-suspend-user.js', function () {// test passed
    });
    it('components/modal-theme-warnings.js', function () {// test passed
    });
    it('components/modal-transfer-owner.js', function () {// test passed
    });
    it('components/modal-unsuspend-user.js', function () {// test passed
    });
    it('components/modal-upload-image.js', function () {// test passed
    });
    it('components/modal-upload-theme.js', function () {// test passed
    });
    it('components/modal-webhook-form.js', function () {// test passed
    });
    it('components/power-select-vertical-collection-options.js', function () {// test passed
    });
    it('components/power-select/trigger.js', function () {// test passed
    });
    it('controllers/about.js', function () {// test passed
    });
    it('controllers/application.js', function () {// test passed
    });
    it('controllers/editor.js', function () {// test passed
    });
    it('controllers/error.js', function () {// test passed
    });
    it('controllers/member.js', function () {// test passed
    });
    it('controllers/members.js', function () {// test passed
    });
    it('controllers/pages-loading.js', function () {// test passed
    });
    it('controllers/pages.js', function () {// test passed
    });
    it('controllers/posts-loading.js', function () {// test passed
    });
    it('controllers/posts.js', function () {// test passed
    });
    it('controllers/reset.js', function () {// test passed
    });
    it('controllers/settings/code-injection.js', function () {// test passed
    });
    it('controllers/settings/design.js', function () {// test passed
    });
    it('controllers/settings/general.js', function () {// test passed
    });
    it('controllers/settings/integration.js', function () {// test passed
    });
    it('controllers/settings/integration/webhooks/edit.js', function () {// test passed
    });
    it('controllers/settings/integration/webhooks/new.js', function () {// test passed
    });
    it('controllers/settings/integrations.js', function () {// test passed
    });
    it('controllers/settings/integrations/amp.js', function () {// test passed
    });
    it('controllers/settings/integrations/new.js', function () {// test passed
    });
    it('controllers/settings/integrations/slack.js', function () {// test passed
    });
    it('controllers/settings/integrations/unsplash.js', function () {// test passed
    });
    it('controllers/settings/integrations/zapier.js', function () {// test passed
    });
    it('controllers/settings/labs.js', function () {// test passed
    });
    it('controllers/settings/tags.js', function () {// test passed
    });
    it('controllers/settings/tags/tag.js', function () {// test passed
    });
    it('controllers/setup.js', function () {// test passed
    });
    it('controllers/setup/three.js', function () {// test passed
    });
    it('controllers/setup/two.js', function () {// test passed
    });
    it('controllers/signin.js', function () {// test passed
    });
    it('controllers/signup.js', function () {// test passed
    });
    it('controllers/site.js', function () {// test passed
    });
    it('controllers/staff/index.js', function () {// test passed
    });
    it('controllers/staff/user.js', function () {// test passed
    });
    it('controllers/subscribers.js', function () {// test passed
    });
    it('helpers/author-names.js', function () {// test passed
    });
    it('helpers/background-image-style.js', function () {// test passed
    });
    it('helpers/event-name.js', function () {// test passed
    });
    it('helpers/gh-count-characters.js', function () {// test passed
    });
    it('helpers/gh-count-down-characters.js', function () {// test passed
    });
    it('helpers/gh-format-html.js', function () {// test passed
    });
    it('helpers/gh-format-post-time.js', function () {// test passed
    });
    it('helpers/gh-path.js', function () {// test passed
    });
    it('helpers/gh-user-can-admin.js', function () {// test passed
    });
    it('helpers/highlighted-text.js', function () {// test passed
    });
    it('helpers/integration-icon-style.js', function () {// test passed
    });
    it('helpers/is-equal.js', function () {// test passed
    });
    it('helpers/is-not.js', function () {// test passed
    });
    it('helpers/ui-btn-span.js', function () {// test passed
    });
    it('helpers/ui-btn.js', function () {// test passed
    });
    it('helpers/ui-text.js', function () {// test passed
    });
    it('initializers/ember-simple-auth.js', function () {// test passed
    });
    it('initializers/trailing-hash.js', function () {// test passed
    });
    it('initializers/upgrade-status.js', function () {// test passed
    });
    it('mixins/body-event-listener.js', function () {// test passed
    });
    it('mixins/current-user-settings.js', function () {// test passed
    });
    it('mixins/dropdown-mixin.js', function () {// test passed
    });
    it('mixins/pagination.js', function () {// test passed
    });
    it('mixins/settings-menu-component.js', function () {// test passed
    });
    it('mixins/shortcuts-route.js', function () {// test passed
    });
    it('mixins/shortcuts.js', function () {// test passed
    });
    it('mixins/slug-url.js', function () {// test passed
    });
    it('mixins/style-body.js', function () {// test passed
    });
    it('mixins/text-input.js', function () {// test passed
    });
    it('mixins/unauthenticated-route-mixin.js', function () {// test passed
    });
    it('mixins/validation-engine.js', function () {// test passed
    });
    it('mixins/validation-state.js', function () {// test passed
    });
    it('models/api-key.js', function () {// test passed
    });
    it('models/integration.js', function () {// test passed
    });
    it('models/invite.js', function () {// test passed
    });
    it('models/member-subscription.js', function () {// test passed
    });
    it('models/member.js', function () {// test passed
    });
    it('models/navigation-item.js', function () {// test passed
    });
    it('models/notification.js', function () {// test passed
    });
    it('models/page.js', function () {// test passed
    });
    it('models/post.js', function () {// test passed
    });
    it('models/role.js', function () {// test passed
    });
    it('models/setting.js', function () {// test passed
    });
    it('models/slack-integration.js', function () {// test passed
    });
    it('models/subscriber.js', function () {// test passed
    });
    it('models/tag.js', function () {// test passed
    });
    it('models/theme.js', function () {// test passed
    });
    it('models/unsplash-integration.js', function () {// test passed
    });
    it('models/user.js', function () {// test passed
    });
    it('models/webhook.js', function () {// test passed
    });
    it('resolver.js', function () {// test passed
    });
    it('router.js', function () {// test passed
    });
    it('routes/about.js', function () {// test passed
    });
    it('routes/application.js', function () {// test passed
    });
    it('routes/authenticated.js', function () {// test passed
    });
    it('routes/editor.js', function () {// test passed
    });
    it('routes/editor/edit.js', function () {// test passed
    });
    it('routes/editor/index.js', function () {// test passed
    });
    it('routes/editor/new.js', function () {// test passed
    });
    it('routes/error404.js', function () {// test passed
    });
    it('routes/home.js', function () {// test passed
    });
    it('routes/member.js', function () {// test passed
    });
    it('routes/members.js', function () {// test passed
    });
    it('routes/pages.js', function () {// test passed
    });
    it('routes/posts.js', function () {// test passed
    });
    it('routes/reset.js', function () {// test passed
    });
    it('routes/settings/code-injection.js', function () {// test passed
    });
    it('routes/settings/design.js', function () {// test passed
    });
    it('routes/settings/design/uploadtheme.js', function () {// test passed
    });
    it('routes/settings/general.js', function () {// test passed
    });
    it('routes/settings/integration.js', function () {// test passed
    });
    it('routes/settings/integration/webhooks/edit.js', function () {// test passed
    });
    it('routes/settings/integration/webhooks/new.js', function () {// test passed
    });
    it('routes/settings/integrations.js', function () {// test passed
    });
    it('routes/settings/integrations/amp.js', function () {// test passed
    });
    it('routes/settings/integrations/new.js', function () {// test passed
    });
    it('routes/settings/integrations/slack.js', function () {// test passed
    });
    it('routes/settings/integrations/unsplash.js', function () {// test passed
    });
    it('routes/settings/integrations/zapier.js', function () {// test passed
    });
    it('routes/settings/labs.js', function () {// test passed
    });
    it('routes/settings/tags.js', function () {// test passed
    });
    it('routes/settings/tags/index.js', function () {// test passed
    });
    it('routes/settings/tags/new.js', function () {// test passed
    });
    it('routes/settings/tags/tag.js', function () {// test passed
    });
    it('routes/setup.js', function () {// test passed
    });
    it('routes/setup/index.js', function () {// test passed
    });
    it('routes/setup/three.js', function () {// test passed
    });
    it('routes/signin.js', function () {// test passed
    });
    it('routes/signout.js', function () {// test passed
    });
    it('routes/signup.js', function () {// test passed
    });
    it('routes/site.js', function () {// test passed
    });
    it('routes/staff/index.js', function () {// test passed
    });
    it('routes/staff/user.js', function () {// test passed
    });
    it('routes/subscribers.js', function () {// test passed
    });
    it('routes/subscribers/import.js', function () {// test passed
    });
    it('routes/subscribers/new.js', function () {// test passed
    });
    it('serializers/api-key.js', function () {// test passed
    });
    it('serializers/application.js', function () {// test passed
    });
    it('serializers/integration.js', function () {// test passed
    });
    it('serializers/invite.js', function () {// test passed
    });
    it('serializers/notification.js', function () {// test passed
    });
    it('serializers/page.js', function () {// test passed
    });
    it('serializers/post.js', function () {// test passed
    });
    it('serializers/role.js', function () {// test passed
    });
    it('serializers/setting.js', function () {// test passed
    });
    it('serializers/subscriber.js', function () {// test passed
    });
    it('serializers/tag.js', function () {// test passed
    });
    it('serializers/theme.js', function () {// test passed
    });
    it('serializers/user.js', function () {// test passed
    });
    it('serializers/webhook.js', function () {// test passed
    });
    it('services/ajax.js', function () {// test passed
    });
    it('services/clock.js', function () {// test passed
    });
    it('services/config.js', function () {// test passed
    });
    it('services/dropdown.js', function () {// test passed
    });
    it('services/event-bus.js', function () {// test passed
    });
    it('services/feature.js', function () {// test passed
    });
    it('services/ghost-paths.js', function () {// test passed
    });
    it('services/lazy-loader.js', function () {// test passed
    });
    it('services/media-queries.js', function () {// test passed
    });
    it('services/media.js', function () {// test passed
    });
    it('services/notifications.js', function () {// test passed
    });
    it('services/resize-detector.js', function () {// test passed
    });
    it('services/session.js', function () {// test passed
    });
    it('services/settings.js', function () {// test passed
    });
    it('services/slug-generator.js', function () {// test passed
    });
    it('services/tour.js', function () {// test passed
    });
    it('services/ui.js', function () {// test passed
    });
    it('services/unsplash.js', function () {// test passed
    });
    it('services/upgrade-status.js', function () {// test passed
    });
    it('session-stores/application.js', function () {// test passed
    });
    it('transforms/facebook-url-user.js', function () {// test passed
    });
    it('transforms/json-string.js', function () {// test passed
    });
    it('transforms/member-subscription.js', function () {// test passed
    });
    it('transforms/moment-date.js', function () {// test passed
    });
    it('transforms/moment-utc.js', function () {// test passed
    });
    it('transforms/navigation-settings.js', function () {// test passed
    });
    it('transforms/raw.js', function () {// test passed
    });
    it('transforms/slack-settings.js', function () {// test passed
    });
    it('transforms/twitter-url-user.js', function () {// test passed
    });
    it('transforms/unsplash-settings.js', function () {// test passed
    });
    it('transitions.js', function () {// test passed
    });
    it('transitions/wormhole.js', function () {// test passed
    });
    it('utils/bound-one-way.js', function () {// test passed
    });
    it('utils/caja-sanitizers.js', function () {// test passed
    });
    it('utils/copy-text-to-clipboard.js', function () {// test passed
    });
    it('utils/ctrl-or-cmd.js', function () {// test passed
    });
    it('utils/document-title.js', function () {// test passed
    });
    it('utils/format-markdown.js', function () {// test passed
    });
    it('utils/ghost-paths.js', function () {// test passed
    });
    it('utils/isFinite.js', function () {// test passed
    });
    it('utils/isNumber.js', function () {// test passed
    });
    it('utils/link-component.js', function () {// test passed
    });
    it('utils/random-password.js', function () {// test passed
    });
    it('utils/route.js', function () {// test passed
    });
    it('utils/titleize.js', function () {// test passed
    });
    it('utils/window-proxy.js', function () {// test passed
    });
    it('validators/base.js', function () {// test passed
    });
    it('validators/integration.js', function () {// test passed
    });
    it('validators/invite-user.js', function () {// test passed
    });
    it('validators/mixins/password.js', function () {// test passed
    });
    it('validators/nav-item.js', function () {// test passed
    });
    it('validators/new-user.js', function () {// test passed
    });
    it('validators/post.js', function () {// test passed
    });
    it('validators/reset.js', function () {// test passed
    });
    it('validators/setting.js', function () {// test passed
    });
    it('validators/setup.js', function () {// test passed
    });
    it('validators/signin.js', function () {// test passed
    });
    it('validators/signup.js', function () {// test passed
    });
    it('validators/slack-integration.js', function () {// test passed
    });
    it('validators/subscriber.js', function () {// test passed
    });
    it('validators/tag-settings.js', function () {// test passed
    });
    it('validators/user.js', function () {// test passed
    });
    it('validators/webhook.js', function () {// test passed
    });
  });
});
define("ghost-admin/tests/lint/tests.lint-test", [], function () {
  "use strict";

  describe('ESLint | tests', function () {
    it('acceptance/authentication-test.js', function () {// test passed
    });
    it('acceptance/content-test.js', function () {// test passed
    });
    it('acceptance/custom-post-templates-test.js', function () {// test passed
    });
    it('acceptance/editor-test.js', function () {// test passed
    });
    it('acceptance/error-handling-test.js', function () {// test passed
    });
    it('acceptance/members-test.js', function () {// test passed
    });
    it('acceptance/password-reset-test.js', function () {// test passed
    });
    it('acceptance/settings/amp-test.js', function () {// test passed
    });
    it('acceptance/settings/code-injection-test.js', function () {// test passed
    });
    it('acceptance/settings/design-test.js', function () {// test passed
    });
    it('acceptance/settings/general-test.js', function () {// test passed
    });
    it('acceptance/settings/integrations-test.js', function () {// test passed
    });
    it('acceptance/settings/labs-test.js', function () {// test passed
    });
    it('acceptance/settings/slack-test.js', function () {// test passed
    });
    it('acceptance/settings/tags-test.js', function () {// test passed
    });
    it('acceptance/settings/unsplash-test.js', function () {// test passed
    });
    it('acceptance/settings/zapier-test.js', function () {// test passed
    });
    it('acceptance/setup-test.js', function () {// test passed
    });
    it('acceptance/signin-test.js', function () {// test passed
    });
    it('acceptance/signup-test.js', function () {// test passed
    });
    it('acceptance/staff-test.js', function () {// test passed
    });
    it('acceptance/subscribers-test.js', function () {// test passed
    });
    it('helpers/adapter-error.js', function () {// test passed
    });
    it('helpers/file-upload.js', function () {// test passed
    });
    it('helpers/find.js', function () {// test passed
    });
    it('helpers/resolver.js', function () {// test passed
    });
    it('helpers/visit.js', function () {// test passed
    });
    it('integration/adapters/tag-test.js', function () {// test passed
    });
    it('integration/adapters/user-test.js', function () {// test passed
    });
    it('integration/components/gh-alert-test.js', function () {// test passed
    });
    it('integration/components/gh-alerts-test.js', function () {// test passed
    });
    it('integration/components/gh-basic-dropdown-test.js', function () {// test passed
    });
    it('integration/components/gh-cm-editor-test.js', function () {// test passed
    });
    it('integration/components/gh-download-count-test.js', function () {// test passed
    });
    it('integration/components/gh-feature-flag-test.js', function () {// test passed
    });
    it('integration/components/gh-file-uploader-test.js', function () {// test passed
    });
    it('integration/components/gh-image-uploader-test.js', function () {// test passed
    });
    it('integration/components/gh-image-uploader-with-preview-test.js', function () {// test passed
    });
    it('integration/components/gh-member-avatar-test.js', function () {// test passed
    });
    it('integration/components/gh-navitem-test.js', function () {// test passed
    });
    it('integration/components/gh-navitem-url-input-test.js', function () {// test passed
    });
    it('integration/components/gh-notification-test.js', function () {// test passed
    });
    it('integration/components/gh-notifications-test.js', function () {// test passed
    });
    it('integration/components/gh-profile-image-test.js', function () {// test passed
    });
    it('integration/components/gh-psm-tags-input-test.js', function () {// test passed
    });
    it('integration/components/gh-psm-template-select-test.js', function () {// test passed
    });
    it('integration/components/gh-search-input-test.js', function () {// test passed
    });
    it('integration/components/gh-tag-settings-form-test.js', function () {// test passed
    });
    it('integration/components/gh-task-button-test.js', function () {// test passed
    });
    it('integration/components/gh-theme-table-test.js', function () {// test passed
    });
    it('integration/components/gh-timezone-select-test.js', function () {// test passed
    });
    it('integration/components/gh-trim-focus-input-test.js', function () {// test passed
    });
    it('integration/components/gh-unsplash-photo-test.js', function () {// test passed
    });
    it('integration/components/gh-unsplash-test.js', function () {// test passed
    });
    it('integration/components/gh-uploader-test.js', function () {// test passed
    });
    it('integration/components/gh-validation-status-container-test.js', function () {// test passed
    });
    it('integration/components/modal-transfer-owner-test.js', function () {// test passed
    });
    it('integration/helpers/background-image-style-test.js', function () {// test passed
    });
    it('integration/helpers/clean-basic-html-test.js', function () {// test passed
    });
    it('integration/helpers/sanitize-html-test.js', function () {// test passed
    });
    it('integration/services/ajax-test.js', function () {// test passed
    });
    it('integration/services/config-test.js', function () {// test passed
    });
    it('integration/services/feature-test.js', function () {// test passed
    });
    it('integration/services/lazy-loader-test.js', function () {// test passed
    });
    it('integration/services/slug-generator-test.js', function () {// test passed
    });
    it('integration/services/store-test.js', function () {// test passed
    });
    it('test-helper.js', function () {// test passed
    });
    it('unit/authenticators/cookie-test.js', function () {// test passed
    });
    it('unit/components/gh-alert-test.js', function () {// test passed
    });
    it('unit/components/gh-app-test.js', function () {// test passed
    });
    it('unit/components/gh-navitem-url-input-test.js', function () {// test passed
    });
    it('unit/components/gh-notification-test.js', function () {// test passed
    });
    it('unit/components/gh-post-settings-menu-test.js', function () {// test passed
    });
    it('unit/components/gh-url-preview-test.js', function () {// test passed
    });
    it('unit/components/gh-user-active-test.js', function () {// test passed
    });
    it('unit/components/gh-user-invited-test.js', function () {// test passed
    });
    it('unit/controllers/editor-test.js', function () {// test passed
    });
    it('unit/controllers/settings/design-test.js', function () {// test passed
    });
    it('unit/controllers/subscribers-test.js', function () {// test passed
    });
    it('unit/helpers/gh-count-characters-test.js', function () {// test passed
    });
    it('unit/helpers/gh-count-down-characters-test.js', function () {// test passed
    });
    it('unit/helpers/gh-format-post-time-test.js', function () {// test passed
    });
    it('unit/helpers/gh-user-can-admin-test.js', function () {// test passed
    });
    it('unit/helpers/highlighted-text-test.js', function () {// test passed
    });
    it('unit/helpers/is-equal-test.js', function () {// test passed
    });
    it('unit/helpers/is-not-test.js', function () {// test passed
    });
    it('unit/mixins/validation-engine-test.js', function () {// test passed
    });
    it('unit/models/api-key-test.js', function () {// test passed
    });
    it('unit/models/integration-test.js', function () {// test passed
    });
    it('unit/models/invite-test.js', function () {// test passed
    });
    it('unit/models/member-test.js', function () {// test passed
    });
    it('unit/models/navigation-item-test.js', function () {// test passed
    });
    it('unit/models/post-test.js', function () {// test passed
    });
    it('unit/models/role-test.js', function () {// test passed
    });
    it('unit/models/setting-test.js', function () {// test passed
    });
    it('unit/models/subscriber-test.js', function () {// test passed
    });
    it('unit/models/tag-test.js', function () {// test passed
    });
    it('unit/models/user-test.js', function () {// test passed
    });
    it('unit/models/webhook-test.js', function () {// test passed
    });
    it('unit/serializers/api-key-test.js', function () {// test passed
    });
    it('unit/serializers/integration-test.js', function () {// test passed
    });
    it('unit/serializers/notification-test.js', function () {// test passed
    });
    it('unit/serializers/post-test.js', function () {// test passed
    });
    it('unit/serializers/role-test.js', function () {// test passed
    });
    it('unit/serializers/setting-test.js', function () {// test passed
    });
    it('unit/serializers/subscriber-test.js', function () {// test passed
    });
    it('unit/serializers/tag-test.js', function () {// test passed
    });
    it('unit/serializers/user-test.js', function () {// test passed
    });
    it('unit/serializers/webhook-test.js', function () {// test passed
    });
    it('unit/services/event-bus-test.js', function () {// test passed
    });
    it('unit/services/notifications-test.js', function () {// test passed
    });
    it('unit/services/resize-detector-test.js', function () {// test passed
    });
    it('unit/services/ui-test.js', function () {// test passed
    });
    it('unit/services/unsplash-test.js', function () {// test passed
    });
    it('unit/services/upgrade-status-test.js', function () {// test passed
    });
    it('unit/transforms/facebook-url-user-test.js', function () {// test passed
    });
    it('unit/transforms/json-string-test.js', function () {// test passed
    });
    it('unit/transforms/navigation-settings-test.js', function () {// test passed
    });
    it('unit/transforms/slack-settings-test.js', function () {// test passed
    });
    it('unit/transforms/twitter-url-user-test.js', function () {// test passed
    });
    it('unit/transforms/unsplash-settings-test.js', function () {// test passed
    });
    it('unit/utils/ghost-paths-test.js', function () {// test passed
    });
    it('unit/validators/nav-item-test.js', function () {// test passed
    });
    it('unit/validators/post-test.js', function () {// test passed
    });
    it('unit/validators/slack-integration-test.js', function () {// test passed
    });
    it('unit/validators/subscriber-test.js', function () {// test passed
    });
    it('unit/validators/tag-settings-test.js', function () {// test passed
    });
  });
});
define("ghost-admin/tests/test-helper", ["ghost-admin/app", "ghost-admin/config/environment", "ember-exam/test-support/load", "ember-raf-scheduler/test-support/register-waiter", "@ember/test-helpers"], function (_app, _environment, _load, _registerWaiter, _testHelpers) {
  "use strict";

  (0, _load.default)();
  (0, _testHelpers.setApplication)(_app.default.create(_environment.default.APP));
  (0, _registerWaiter.default)();
  mocha.setup({
    timeout: 15000,
    slow: 500
  });
});
define("ghost-admin/tests/unit/authenticators/cookie-test", ["sinon", "mocha", "chai", "ember-mocha"], function (_sinon, _mocha, _chai, _emberMocha) {
  "use strict";

  const mockAjax = Ember.Service.extend({
    skipSessionDeletion: false,

    init() {
      this._super(...arguments);

      this.post = _sinon.default.stub().resolves();
      this.del = _sinon.default.stub().resolves();
    }

  });
  const mockGhostPaths = Ember.Service.extend({
    apiRoot: '/ghost/api/v2/admin'
  });
  (0, _mocha.describe)('Unit: Authenticator: cookie', () => {
    (0, _emberMocha.setupTest)('authenticator:cookie', {});
    (0, _mocha.beforeEach)(function () {
      this.register('service:ajax', mockAjax);
      this.inject.service('ajax', {
        as: 'ajax'
      });
      this.register('service:ghost-paths', mockGhostPaths);
      this.inject.service('ghost-paths', {
        as: 'ghostPaths'
      });
    });
    (0, _mocha.describe)('#restore', function () {
      (0, _mocha.it)('returns a resolving promise', function () {
        return this.subject().restore();
      });
    });
    (0, _mocha.describe)('#authenticate', function () {
      (0, _mocha.it)('posts the username and password to the sessionEndpoint and returns the promise', function () {
        let authenticator = this.subject();
        let post = authenticator.ajax.post;
        return authenticator.authenticate('AzureDiamond', 'hunter2').then(() => {
          (0, _chai.expect)(post.args[0][0]).to.equal('/ghost/api/v2/admin/session');
          (0, _chai.expect)(post.args[0][1]).to.deep.include({
            data: {
              username: 'AzureDiamond',
              password: 'hunter2'
            }
          });
          (0, _chai.expect)(post.args[0][1]).to.deep.include({
            dataType: 'text'
          });
          (0, _chai.expect)(post.args[0][1]).to.deep.include({
            contentType: 'application/json;charset=utf-8'
          });
        });
      });
    });
    (0, _mocha.describe)('#invalidate', function () {
      (0, _mocha.it)('makes a delete request to the sessionEndpoint', function () {
        let authenticator = this.subject();
        let del = authenticator.ajax.del;
        return authenticator.invalidate().then(() => {
          (0, _chai.expect)(del.args[0][0]).to.equal('/ghost/api/v2/admin/session');
        });
      });
    });
  });
});
define("ghost-admin/tests/unit/components/gh-alert-test", ["sinon", "mocha", "chai", "ember-mocha"], function (_sinon, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Component: gh-alert', function () {
    (0, _emberMocha.setupComponentTest)('gh-alert', {
      unit: true,
      // specify the other units that are required for this test
      needs: ['service:notifications', 'helper:svg-jar']
    });
    (0, _mocha.it)('closes notification through notifications service', function () {
      let component = this.subject();
      let notifications = {};
      let notification = {
        message: 'Test close',
        type: 'success'
      };
      notifications.closeNotification = _sinon.default.spy();
      component.set('notifications', notifications);
      component.set('message', notification);
      this.$().find('button').click();
      (0, _chai.expect)(notifications.closeNotification.calledWith(notification)).to.be.true;
    });
  });
});
define("ghost-admin/tests/unit/components/gh-app-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Component: gh-app', function () {
    (0, _emberMocha.setupComponentTest)('gh-app', {
      unit: true // specify the other units that are required for this test
      // needs: ['component:foo', 'helper:bar']

    });
    (0, _mocha.it)('renders', function () {
      // creates the component instance
      let component = this.subject();
      (0, _chai.expect)(component._state).to.equal('preRender'); // renders the component on the page

      this.render();
      (0, _chai.expect)(component._state).to.equal('inDOM');
    });
  });
});
define("ghost-admin/tests/unit/components/gh-navitem-url-input-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Component: gh-navitem-url-input', function () {
    (0, _emberMocha.setupComponentTest)('gh-navitem-url-input', {
      unit: true
    });
    (0, _mocha.it)('identifies a URL as the base URL', function () {
      let component = this.subject({
        url: '',
        baseUrl: 'http://example.com/'
      });
      this.render();
      Ember.run(function () {
        component.set('value', 'http://example.com/');
      });
      (0, _chai.expect)(component.get('isBaseUrl')).to.be.ok;
      Ember.run(function () {
        component.set('value', 'http://example.com/go/');
      });
      (0, _chai.expect)(component.get('isBaseUrl')).to.not.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/components/gh-notification-test", ["sinon", "mocha", "chai", "ember-mocha"], function (_sinon, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Component: gh-notification', function () {
    (0, _emberMocha.setupComponentTest)('gh-notification', {
      unit: true,
      // specify the other units that are required for this test
      needs: ['service:notifications', 'helper:svg-jar']
    });
    (0, _mocha.it)('closes notification through notifications service', function () {
      let component = this.subject();
      let notifications = {};
      let notification = {
        message: 'Test close',
        type: 'success'
      };
      notifications.closeNotification = _sinon.default.spy();
      component.set('notifications', notifications);
      component.set('message', notification);
      this.$().find('button').click();
      (0, _chai.expect)(notifications.closeNotification.calledWith(notification)).to.be.true;
    }); // skipped due to random failures on Travis - https://github.com/TryGhost/Ghost/issues/10308

    _mocha.it.skip('closes notification when animationend event is triggered', function (done) {
      let component = this.subject();
      let notifications = {};
      let notification = {
        message: 'Test close',
        type: 'success'
      };
      notifications.closeNotification = _sinon.default.spy();
      component.set('notifications', notifications);
      component.set('message', notification); // shorten the animation delay to speed up test

      this.$().css('animation-delay', '0.1s');
      setTimeout(function () {
        (0, _chai.expect)(notifications.closeNotification.calledWith(notification)).to.be.true;
        done();
      }, 150);
    });
  });
});
define("ghost-admin/tests/unit/components/gh-post-settings-menu-test", ["ghost-admin/utils/bound-one-way", "mocha", "chai", "ember-mocha"], function (_boundOneWay, _mocha, _chai, _emberMocha) {
  "use strict";

  function K() {
    return this;
  } // TODO: convert to integration tests


  _mocha.describe.skip('Unit: Component: post-settings-menu', function () {
    (0, _emberMocha.setupComponentTest)('gh-post-settings-menu', {
      needs: ['service:notifications', 'service:slug-generator', 'service:settings']
    });
    (0, _mocha.it)('slugValue is one-way bound to post.slug', function () {
      let component = this.subject({
        post: Ember.Object.create({
          slug: 'a-slug'
        })
      });
      (0, _chai.expect)(component.get('post.slug')).to.equal('a-slug');
      (0, _chai.expect)(component.get('slugValue')).to.equal('a-slug');
      Ember.run(function () {
        component.set('post.slug', 'changed-slug');
        (0, _chai.expect)(component.get('slugValue')).to.equal('changed-slug');
      });
      Ember.run(function () {
        component.set('slugValue', 'changed-directly');
        (0, _chai.expect)(component.get('post.slug')).to.equal('changed-slug');
        (0, _chai.expect)(component.get('slugValue')).to.equal('changed-directly');
      });
      Ember.run(function () {
        // test that the one-way binding is still in place
        component.set('post.slug', 'should-update');
        (0, _chai.expect)(component.get('slugValue')).to.equal('should-update');
      });
    });
    (0, _mocha.it)('metaTitleScratch is one-way bound to post.metaTitle', function () {
      let component = this.subject({
        post: Ember.Object.extend({
          metaTitle: 'a title',
          metaTitleScratch: (0, _boundOneWay.default)('metaTitle')
        }).create()
      });
      (0, _chai.expect)(component.get('post.metaTitle')).to.equal('a title');
      (0, _chai.expect)(component.get('metaTitleScratch')).to.equal('a title');
      Ember.run(function () {
        component.set('post.metaTitle', 'a different title');
        (0, _chai.expect)(component.get('metaTitleScratch')).to.equal('a different title');
      });
      Ember.run(function () {
        component.set('metaTitleScratch', 'changed directly');
        (0, _chai.expect)(component.get('post.metaTitle')).to.equal('a different title');
        (0, _chai.expect)(component.get('post.metaTitleScratch')).to.equal('changed directly');
      });
      Ember.run(function () {
        // test that the one-way binding is still in place
        component.set('post.metaTitle', 'should update');
        (0, _chai.expect)(component.get('metaTitleScratch')).to.equal('should update');
      });
    });
    (0, _mocha.it)('metaDescriptionScratch is one-way bound to post.metaDescription', function () {
      let component = this.subject({
        post: Ember.Object.extend({
          metaDescription: 'a description',
          metaDescriptionScratch: (0, _boundOneWay.default)('metaDescription')
        }).create()
      });
      (0, _chai.expect)(component.get('post.metaDescription')).to.equal('a description');
      (0, _chai.expect)(component.get('metaDescriptionScratch')).to.equal('a description');
      Ember.run(function () {
        component.set('post.metaDescription', 'a different description');
        (0, _chai.expect)(component.get('metaDescriptionScratch')).to.equal('a different description');
      });
      Ember.run(function () {
        component.set('metaDescriptionScratch', 'changed directly');
        (0, _chai.expect)(component.get('post.metaDescription')).to.equal('a different description');
        (0, _chai.expect)(component.get('metaDescriptionScratch')).to.equal('changed directly');
      });
      Ember.run(function () {
        // test that the one-way binding is still in place
        component.set('post.metaDescription', 'should update');
        (0, _chai.expect)(component.get('metaDescriptionScratch')).to.equal('should update');
      });
    });
    (0, _mocha.describe)('seoTitle', function () {
      (0, _mocha.it)('should be the metaTitle if one exists', function () {
        let component = this.subject({
          post: Ember.Object.extend({
            titleScratch: 'should not be used',
            metaTitle: 'a meta-title',
            metaTitleScratch: (0, _boundOneWay.default)('metaTitle')
          }).create()
        });
        (0, _chai.expect)(component.get('seoTitle')).to.equal('a meta-title');
      });
      (0, _mocha.it)('should default to the title if an explicit meta-title does not exist', function () {
        let component = this.subject({
          post: Ember.Object.create({
            titleScratch: 'should be the meta-title'
          })
        });
        (0, _chai.expect)(component.get('seoTitle')).to.equal('should be the meta-title');
      });
      (0, _mocha.it)('should be the metaTitle if both title and metaTitle exist', function () {
        let component = this.subject({
          post: Ember.Object.extend({
            titleScratch: 'a title',
            metaTitle: 'a meta-title',
            metaTitleScratch: (0, _boundOneWay.default)('metaTitle')
          }).create()
        });
        (0, _chai.expect)(component.get('seoTitle')).to.equal('a meta-title');
      });
      (0, _mocha.it)('should revert to the title if explicit metaTitle is removed', function () {
        let component = this.subject({
          post: Ember.Object.extend({
            titleScratch: 'a title',
            metaTitle: 'a meta-title',
            metaTitleScratch: (0, _boundOneWay.default)('metaTitle')
          }).create()
        });
        (0, _chai.expect)(component.get('seoTitle')).to.equal('a meta-title');
        Ember.run(function () {
          component.set('post.metaTitle', '');
          (0, _chai.expect)(component.get('seoTitle')).to.equal('a title');
        });
      });
      (0, _mocha.it)('should truncate to 70 characters with an appended ellipsis', function () {
        let longTitle = new Array(100).join('a');
        let component = this.subject({
          post: Ember.Object.create()
        });
        (0, _chai.expect)(longTitle.length).to.equal(99);
        Ember.run(function () {
          let expected = "".concat(longTitle.substr(0, 70), "&hellip;");
          component.set('metaTitleScratch', longTitle);
          (0, _chai.expect)(component.get('seoTitle').toString().length).to.equal(78);
          (0, _chai.expect)(component.get('seoTitle').toString()).to.equal(expected);
        });
      });
    });
    (0, _mocha.describe)('seoDescription', function () {
      (0, _mocha.it)('should be the metaDescription if one exists', function () {
        let component = this.subject({
          post: Ember.Object.extend({
            metaDescription: 'a description',
            metaDescriptionScratch: (0, _boundOneWay.default)('metaDescription')
          }).create()
        });
        (0, _chai.expect)(component.get('seoDescription')).to.equal('a description');
      });
      (0, _mocha.it)('should be generated from the rendered mobiledoc if not explicitly set', function () {
        let component = this.subject({
          post: Ember.Object.extend({
            metaDescription: null,
            metaDescriptionScratch: (0, _boundOneWay.default)('metaDescription'),
            author: Ember.RSVP.resolve(),

            init() {
              this._super(...arguments);

              this.scratch = {
                cards: [['markdown-card', {
                  markdown: '# This is a <strong>test</strong> <script>foo</script>'
                }]]
              };
            }

          }).create()
        });
        (0, _chai.expect)(component.get('seoDescription')).to.equal('This is a test');
      });
      (0, _mocha.it)('should truncate to 156 characters with an appended ellipsis', function () {
        let longDescription = new Array(200).join('a');
        let component = this.subject({
          post: Ember.Object.create()
        });
        (0, _chai.expect)(longDescription.length).to.equal(199);
        Ember.run(function () {
          let expected = "".concat(longDescription.substr(0, 156), "&hellip;");
          component.set('metaDescriptionScratch', longDescription);
          (0, _chai.expect)(component.get('seoDescription').toString().length).to.equal(164);
          (0, _chai.expect)(component.get('seoDescription').toString()).to.equal(expected);
        });
      });
    });
    (0, _mocha.describe)('seoURL', function () {
      (0, _mocha.it)('should be the URL of the blog if no post slug exists', function () {
        let component = this.subject({
          config: Ember.Object.create({
            blogUrl: 'http://my-ghost-blog.com'
          }),
          post: Ember.Object.create()
        });
        (0, _chai.expect)(component.get('seoURL')).to.equal('http://my-ghost-blog.com/');
      });
      (0, _mocha.it)('should be the URL of the blog plus the post slug', function () {
        let component = this.subject({
          config: Ember.Object.create({
            blogUrl: 'http://my-ghost-blog.com'
          }),
          post: Ember.Object.create({
            slug: 'post-slug'
          })
        });
        (0, _chai.expect)(component.get('seoURL')).to.equal('http://my-ghost-blog.com/post-slug/');
      });
      (0, _mocha.it)('should update when the post slug changes', function () {
        let component = this.subject({
          config: Ember.Object.create({
            blogUrl: 'http://my-ghost-blog.com'
          }),
          post: Ember.Object.create({
            slug: 'post-slug'
          })
        });
        (0, _chai.expect)(component.get('seoURL')).to.equal('http://my-ghost-blog.com/post-slug/');
        Ember.run(function () {
          component.set('post.slug', 'changed-slug');
          (0, _chai.expect)(component.get('seoURL')).to.equal('http://my-ghost-blog.com/changed-slug/');
        });
      });
      (0, _mocha.it)('should truncate a long URL to 70 characters with an appended ellipsis', function () {
        let blogURL = 'http://my-ghost-blog.com';
        let longSlug = new Array(75).join('a');
        let component = this.subject({
          config: Ember.Object.create({
            blogUrl: blogURL
          }),
          post: Ember.Object.create({
            slug: longSlug
          })
        });
        let expected;
        (0, _chai.expect)(longSlug.length).to.equal(74);
        expected = "".concat(blogURL, "/").concat(longSlug, "/");
        expected = "".concat(expected.substr(0, 70), "&hellip;");
        (0, _chai.expect)(component.get('seoURL').toString().length).to.equal(78);
        (0, _chai.expect)(component.get('seoURL').toString()).to.equal(expected);
      });
    });
    (0, _mocha.describe)('toggleFeatured', function () {
      (0, _mocha.it)('should toggle the featured property', function () {
        let component = this.subject({
          post: Ember.Object.create({
            featured: false,
            isNew: true
          })
        });
        Ember.run(function () {
          component.send('toggleFeatured');
          (0, _chai.expect)(component.get('post.featured')).to.be.ok;
        });
      });
      (0, _mocha.it)('should not save the post if it is still new', function () {
        let component = this.subject({
          post: Ember.Object.create({
            featured: false,
            isNew: true,

            save() {
              this.incrementProperty('saved');
              return Ember.RSVP.resolve();
            }

          })
        });
        Ember.run(function () {
          component.send('toggleFeatured');
          (0, _chai.expect)(component.get('post.featured')).to.be.ok;
          (0, _chai.expect)(component.get('post.saved')).to.not.be.ok;
        });
      });
      (0, _mocha.it)('should save the post if it is not new', function () {
        let component = this.subject({
          post: Ember.Object.create({
            featured: false,
            isNew: false,

            save() {
              this.incrementProperty('saved');
              return Ember.RSVP.resolve();
            }

          })
        });
        Ember.run(function () {
          component.send('toggleFeatured');
          (0, _chai.expect)(component.get('post.featured')).to.be.ok;
          (0, _chai.expect)(component.get('post.saved')).to.equal(1);
        });
      });
    });
    (0, _mocha.describe)('updateSlug', function () {
      (0, _mocha.it)('should reset slugValue to the previous slug when the new slug is blank or unchanged', function () {
        let component = this.subject({
          post: Ember.Object.create({
            slug: 'slug'
          })
        });
        Ember.run(function () {
          // unchanged
          component.set('slugValue', 'slug');
          component.send('updateSlug', component.get('slugValue'));
          (0, _chai.expect)(component.get('post.slug')).to.equal('slug');
          (0, _chai.expect)(component.get('slugValue')).to.equal('slug');
        });
        Ember.run(function () {
          // unchanged after trim
          component.set('slugValue', 'slug  ');
          component.send('updateSlug', component.get('slugValue'));
          (0, _chai.expect)(component.get('post.slug')).to.equal('slug');
          (0, _chai.expect)(component.get('slugValue')).to.equal('slug');
        });
        Ember.run(function () {
          // blank
          component.set('slugValue', '');
          component.send('updateSlug', component.get('slugValue'));
          (0, _chai.expect)(component.get('post.slug')).to.equal('slug');
          (0, _chai.expect)(component.get('slugValue')).to.equal('slug');
        });
      });
      (0, _mocha.it)('should not set a new slug if the server-generated slug matches existing slug', function (done) {
        let component = this.subject({
          slugGenerator: Ember.Object.create({
            generateSlug(slugType, str) {
              let promise = Ember.RSVP.resolve(str.split('#')[0]);
              this.set('lastPromise', promise);
              return promise;
            }

          }),
          post: Ember.Object.create({
            slug: 'whatever'
          })
        });
        Ember.run(function () {
          component.set('slugValue', 'whatever#slug');
          component.send('updateSlug', component.get('slugValue'));
          Ember.RSVP.resolve(component.get('lastPromise')).then(function () {
            (0, _chai.expect)(component.get('post.slug')).to.equal('whatever');
            done();
          }).catch(done);
        });
      });
      (0, _mocha.it)('should not set a new slug if the only change is to the appended increment value', function (done) {
        let component = this.subject({
          slugGenerator: Ember.Object.create({
            generateSlug(slugType, str) {
              let sanitizedStr = str.replace(/[^a-zA-Z]/g, '');
              let promise = Ember.RSVP.resolve("".concat(sanitizedStr, "-2"));
              this.set('lastPromise', promise);
              return promise;
            }

          }),
          post: Ember.Object.create({
            slug: 'whatever'
          })
        });
        Ember.run(function () {
          component.set('slugValue', 'whatever!');
          component.send('updateSlug', component.get('slugValue'));
          Ember.RSVP.resolve(component.get('lastPromise')).then(function () {
            (0, _chai.expect)(component.get('post.slug')).to.equal('whatever');
            done();
          }).catch(done);
        });
      });
      (0, _mocha.it)('should set the slug if the new slug is different', function (done) {
        let component = this.subject({
          slugGenerator: Ember.Object.create({
            generateSlug(slugType, str) {
              let promise = Ember.RSVP.resolve(str);
              this.set('lastPromise', promise);
              return promise;
            }

          }),
          post: Ember.Object.create({
            slug: 'whatever',
            save: K
          })
        });
        Ember.run(function () {
          component.set('slugValue', 'changed');
          component.send('updateSlug', component.get('slugValue'));
          Ember.RSVP.resolve(component.get('lastPromise')).then(function () {
            (0, _chai.expect)(component.get('post.slug')).to.equal('changed');
            done();
          }).catch(done);
        });
      });
      (0, _mocha.it)('should save the post when the slug changes and the post is not new', function (done) {
        let component = this.subject({
          slugGenerator: Ember.Object.create({
            generateSlug(slugType, str) {
              let promise = Ember.RSVP.resolve(str);
              this.set('lastPromise', promise);
              return promise;
            }

          }),
          post: Ember.Object.create({
            slug: 'whatever',
            saved: 0,
            isNew: false,

            save() {
              this.incrementProperty('saved');
            }

          })
        });
        Ember.run(function () {
          component.set('slugValue', 'changed');
          component.send('updateSlug', component.get('slugValue'));
          Ember.RSVP.resolve(component.get('lastPromise')).then(function () {
            (0, _chai.expect)(component.get('post.slug')).to.equal('changed');
            (0, _chai.expect)(component.get('post.saved')).to.equal(1);
            done();
          }).catch(done);
        });
      });
      (0, _mocha.it)('should not save the post when the slug changes and the post is new', function (done) {
        let component = this.subject({
          slugGenerator: Ember.Object.create({
            generateSlug(slugType, str) {
              let promise = Ember.RSVP.resolve(str);
              this.set('lastPromise', promise);
              return promise;
            }

          }),
          post: Ember.Object.create({
            slug: 'whatever',
            saved: 0,
            isNew: true,

            save() {
              this.incrementProperty('saved');
            }

          })
        });
        Ember.run(function () {
          component.set('slugValue', 'changed');
          component.send('updateSlug', component.get('slugValue'));
          Ember.RSVP.resolve(component.get('lastPromise')).then(function () {
            (0, _chai.expect)(component.get('post.slug')).to.equal('changed');
            (0, _chai.expect)(component.get('post.saved')).to.equal(0);
            done();
          }).catch(done);
        });
      });
    });
  });
});
define("ghost-admin/tests/unit/components/gh-url-preview-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Component: gh-url-preview', function () {
    (0, _emberMocha.setupComponentTest)('gh-url-preview', {
      unit: true,
      needs: ['service:config']
    });
    (0, _mocha.it)('generates the correct preview URL with a prefix', function () {
      let component = this.subject({
        prefix: 'tag',
        slug: 'test-slug',
        tagName: 'p',
        classNames: 'test-class',
        config: {
          blogUrl: 'http://my-ghost-blog.com'
        }
      });
      this.render();
      (0, _chai.expect)(component.get('url')).to.equal('my-ghost-blog.com/tag/test-slug/');
    });
    (0, _mocha.it)('generates the correct preview URL without a prefix', function () {
      let component = this.subject({
        slug: 'test-slug',
        tagName: 'p',
        classNames: 'test-class',
        config: {
          blogUrl: 'http://my-ghost-blog.com'
        }
      });
      this.render();
      (0, _chai.expect)(component.get('url')).to.equal('my-ghost-blog.com/test-slug/');
    });
  });
});
define("ghost-admin/tests/unit/components/gh-user-active-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Component: gh-user-active', function () {
    (0, _emberMocha.setupComponentTest)('gh-user-active', {
      unit: true,
      // specify the other units that are required for this test
      needs: ['service:ghostPaths']
    });
    (0, _mocha.it)('renders', function () {
      // creates the component instance
      let component = this.subject();
      (0, _chai.expect)(component._state).to.equal('preRender'); // renders the component on the page

      this.render();
      (0, _chai.expect)(component._state).to.equal('inDOM');
    });
  });
});
define("ghost-admin/tests/unit/components/gh-user-invited-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Component: gh-user-invited', function () {
    (0, _emberMocha.setupComponentTest)('gh-user-invited', {
      unit: true,
      // specify the other units that are required for this test
      needs: ['service:notifications']
    });
    (0, _mocha.it)('renders', function () {
      // creates the component instance
      let component = this.subject();
      (0, _chai.expect)(component._state).to.equal('preRender'); // renders the component on the page

      this.render();
      (0, _chai.expect)(component._state).to.equal('inDOM');
    });
  });
});
define("ghost-admin/tests/unit/controllers/editor-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha", "ember-concurrency"], function (_mocha, _chai, _testHelpers, _emberMocha, _emberConcurrency) {
  "use strict";

  (0, _mocha.describe)('Unit: Controller: editor', function () {
    (0, _emberMocha.setupTest)();
    (0, _mocha.describe)('generateSlug', function () {
      (0, _mocha.it)('should generate a slug and set it on the post', async function () {
        let controller = this.owner.lookup('controller:editor');
        controller.set('slugGenerator', Ember.Object.create({
          generateSlug(slugType, str) {
            return Ember.RSVP.resolve("".concat(str, "-slug"));
          }

        }));
        controller.set('post', Ember.Object.create({
          slug: ''
        }));
        controller.set('post.titleScratch', 'title');
        await (0, _testHelpers.settled)();
        (0, _chai.expect)(controller.get('post.slug')).to.equal('');
        await controller.get('generateSlug').perform();
        (0, _chai.expect)(controller.get('post.slug')).to.equal('title-slug');
      });
      (0, _mocha.it)('should not set the destination if the title is "(Untitled)" and the post already has a slug', async function () {
        let controller = this.owner.lookup('controller:editor');
        controller.set('slugGenerator', Ember.Object.create({
          generateSlug(slugType, str) {
            return Ember.RSVP.resolve("".concat(str, "-slug"));
          }

        }));
        controller.set('post', Ember.Object.create({
          slug: 'whatever'
        }));
        (0, _chai.expect)(controller.get('post.slug')).to.equal('whatever');
        controller.set('post.titleScratch', '(Untitled)');
        await controller.get('generateSlug').perform();
        (0, _chai.expect)(controller.get('post.slug')).to.equal('whatever');
      });
    });
    (0, _mocha.describe)('saveTitle', function () {
      beforeEach(function () {
        this.controller = this.owner.lookup('controller:editor');
        this.controller.set('target', {
          send() {}

        });
      });
      (0, _mocha.it)('should invoke generateSlug if the post is new and a title has not been set', async function () {
        let controller = this.controller;
        controller.set('target', {
          send() {}

        });
        Ember.defineProperty(controller, 'generateSlug', (0, _emberConcurrency.task)(function* () {
          this.set('post.slug', 'test-slug');
          yield Ember.RSVP.resolve();
        }));
        controller.set('post', Ember.Object.create({
          isNew: true
        }));
        (0, _chai.expect)(controller.get('post.isNew')).to.be.true;
        (0, _chai.expect)(controller.get('post.titleScratch')).to.not.be.ok;
        controller.set('post.titleScratch', 'test');
        await controller.get('saveTitle').perform();
        (0, _chai.expect)(controller.get('post.titleScratch')).to.equal('test');
        (0, _chai.expect)(controller.get('post.slug')).to.equal('test-slug');
      });
      (0, _mocha.it)('should invoke generateSlug if the post is not new and it\'s title is "(Untitled)"', async function () {
        let controller = this.controller;
        controller.set('target', {
          send() {}

        });
        Ember.defineProperty(controller, 'generateSlug', (0, _emberConcurrency.task)(function* () {
          this.set('post.slug', 'test-slug');
          yield Ember.RSVP.resolve();
        }));
        controller.set('post', Ember.Object.create({
          isNew: false,
          title: '(Untitled)'
        }));
        (0, _chai.expect)(controller.get('post.isNew')).to.be.false;
        (0, _chai.expect)(controller.get('post.titleScratch')).to.not.be.ok;
        controller.set('post.titleScratch', 'New Title');
        await controller.get('saveTitle').perform();
        (0, _chai.expect)(controller.get('post.titleScratch')).to.equal('New Title');
        (0, _chai.expect)(controller.get('post.slug')).to.equal('test-slug');
      });
      (0, _mocha.it)('should not invoke generateSlug if the post is new but has a title', async function () {
        let controller = this.controller;
        controller.set('target', {
          send() {}

        });
        Ember.defineProperty(controller, 'generateSlug', (0, _emberConcurrency.task)(function* () {
          (0, _chai.expect)(false, 'generateSlug should not be called').to.equal(true);
          yield Ember.RSVP.resolve();
        }));
        controller.set('post', Ember.Object.create({
          isNew: true,
          title: 'a title'
        }));
        (0, _chai.expect)(controller.get('post.isNew')).to.be.true;
        (0, _chai.expect)(controller.get('post.title')).to.equal('a title');
        (0, _chai.expect)(controller.get('post.titleScratch')).to.not.be.ok;
        controller.set('post.titleScratch', 'test');
        await controller.get('saveTitle').perform();
        (0, _chai.expect)(controller.get('post.titleScratch')).to.equal('test');
        (0, _chai.expect)(controller.get('post.slug')).to.not.be.ok;
      });
      (0, _mocha.it)('should not invoke generateSlug if the post is not new and the title is not "(Untitled)"', async function () {
        let controller = this.controller;
        controller.set('target', {
          send() {}

        });
        Ember.defineProperty(controller, 'generateSlug', (0, _emberConcurrency.task)(function* () {
          (0, _chai.expect)(false, 'generateSlug should not be called').to.equal(true);
          yield Ember.RSVP.resolve();
        }));
        controller.set('post', Ember.Object.create({
          isNew: false
        }));
        (0, _chai.expect)(controller.get('post.isNew')).to.be.false;
        (0, _chai.expect)(controller.get('post.title')).to.not.be.ok;
        controller.set('post.titleScratch', 'title');
        await controller.get('saveTitle').perform();
        (0, _chai.expect)(controller.get('post.titleScratch')).to.equal('title');
        (0, _chai.expect)(controller.get('post.slug')).to.not.be.ok;
      });
    });
  });
});
define("ghost-admin/tests/unit/controllers/settings/design-test", ["ghost-admin/models/navigation-item", "chai", "mocha", "ember-mocha"], function (_navigationItem, _chai, _mocha, _emberMocha) {
  "use strict";

  // const navSettingJSON = `[
  //     {"label":"Home","url":"/"},
  //     {"label":"JS Test","url":"javascript:alert('hello');"},
  //     {"label":"About","url":"/about"},
  //     {"label":"Sub Folder","url":"/blah/blah"},
  //     {"label":"Telephone","url":"tel:01234-567890"},
  //     {"label":"Mailto","url":"mailto:test@example.com"},
  //     {"label":"External","url":"https://example.com/testing?query=test#anchor"},
  //     {"label":"No Protocol","url":"//example.com"}
  // ]`;
  (0, _mocha.describe)('Unit: Controller: settings/design', function () {
    (0, _emberMocha.setupTest)('controller:settings/design', {
      // Specify the other units that are required for this test.
      needs: ['model:navigation-item', 'service:ajax', 'service:config', 'service:ghostPaths', 'service:notifications', 'service:session', 'service:upgrade-status', 'service:settings']
    });
    (0, _mocha.it)('blogUrl: captures config and ensures trailing slash', function () {
      let ctrl = this.subject();
      ctrl.set('config.blogUrl', 'http://localhost:2368/blog');
      (0, _chai.expect)(ctrl.get('blogUrl')).to.equal('http://localhost:2368/blog/');
    });
    (0, _mocha.it)('init: creates a new navigation item', function () {
      let ctrl = this.subject();
      Ember.run(() => {
        (0, _chai.expect)(ctrl.get('newNavItem')).to.exist;
        (0, _chai.expect)(ctrl.get('newNavItem.isNew')).to.be.true;
      });
    });
    (0, _mocha.it)('blogUrl: captures config and ensures trailing slash', function () {
      let ctrl = this.subject();
      ctrl.set('config.blogUrl', 'http://localhost:2368/blog');
      (0, _chai.expect)(ctrl.get('blogUrl')).to.equal('http://localhost:2368/blog/');
    });
    (0, _mocha.it)('save: validates nav items', function (done) {
      let ctrl = this.subject();
      Ember.run(() => {
        ctrl.set('settings', Ember.Object.create({
          navigation: [_navigationItem.default.create({
            label: 'First',
            url: '/'
          }), _navigationItem.default.create({
            label: '',
            url: '/second'
          }), _navigationItem.default.create({
            label: 'Third',
            url: ''
          })]
        })); // blank item won't get added because the last item is incomplete

        (0, _chai.expect)(ctrl.get('settings.navigation.length')).to.equal(3);
        ctrl.get('save').perform().then(function passedValidation() {
          (0, _chai.assert)(false, 'navigationItems weren\'t validated on save');
          done();
        }).catch(function failedValidation() {
          let navItems = ctrl.get('settings.navigation');
          (0, _chai.expect)(navItems[0].get('errors').toArray()).to.be.empty;
          (0, _chai.expect)(navItems[1].get('errors.firstObject.attribute')).to.equal('label');
          (0, _chai.expect)(navItems[2].get('errors.firstObject.attribute')).to.equal('url');
          done();
        });
      });
    });
    (0, _mocha.it)('save: ignores blank last item when saving', function (done) {
      let ctrl = this.subject();
      Ember.run(() => {
        ctrl.set('settings', Ember.Object.create({
          navigation: [_navigationItem.default.create({
            label: 'First',
            url: '/'
          }), _navigationItem.default.create({
            label: '',
            url: ''
          })]
        }));
        (0, _chai.expect)(ctrl.get('settings.navigation.length')).to.equal(2);
        ctrl.get('save').perform().then(function passedValidation() {
          (0, _chai.assert)(false, 'navigationItems weren\'t validated on save');
          done();
        }).catch(function failedValidation() {
          let navItems = ctrl.get('settings.navigation');
          (0, _chai.expect)(navItems[0].get('errors').toArray()).to.be.empty;
          done();
        });
      });
    });
    (0, _mocha.it)('action - addNavItem: adds item to navigationItems', function () {
      let ctrl = this.subject();
      Ember.run(() => {
        ctrl.set('settings', Ember.Object.create({
          navigation: [_navigationItem.default.create({
            label: 'First',
            url: '/first',
            last: true
          })]
        }));
      });
      (0, _chai.expect)(ctrl.get('settings.navigation.length')).to.equal(1);
      ctrl.set('newNavItem.label', 'New');
      ctrl.set('newNavItem.url', '/new');
      Ember.run(() => {
        ctrl.send('addNavItem');
      });
      (0, _chai.expect)(ctrl.get('settings.navigation.length')).to.equal(2);
      (0, _chai.expect)(ctrl.get('settings.navigation.lastObject.label')).to.equal('New');
      (0, _chai.expect)(ctrl.get('settings.navigation.lastObject.url')).to.equal('/new');
      (0, _chai.expect)(ctrl.get('settings.navigation.lastObject.isNew')).to.be.false;
      (0, _chai.expect)(ctrl.get('newNavItem.label')).to.be.empty;
      (0, _chai.expect)(ctrl.get('newNavItem.url')).to.be.empty;
      (0, _chai.expect)(ctrl.get('newNavItem.isNew')).to.be.true;
    });
    (0, _mocha.it)('action - addNavItem: doesn\'t insert new item if last object is incomplete', function () {
      let ctrl = this.subject();
      Ember.run(() => {
        ctrl.set('settings', Ember.Object.create({
          navigation: [_navigationItem.default.create({
            label: '',
            url: '',
            last: true
          })]
        }));
        (0, _chai.expect)(ctrl.get('settings.navigation.length')).to.equal(1);
        ctrl.send('addNavItem');
        (0, _chai.expect)(ctrl.get('settings.navigation.length')).to.equal(1);
      });
    });
    (0, _mocha.it)('action - deleteNavItem: removes item from navigationItems', function () {
      let ctrl = this.subject();
      let navItems = [_navigationItem.default.create({
        label: 'First',
        url: '/first'
      }), _navigationItem.default.create({
        label: 'Second',
        url: '/second',
        last: true
      })];
      Ember.run(() => {
        ctrl.set('settings', Ember.Object.create({
          navigation: navItems
        }));
        (0, _chai.expect)(ctrl.get('settings.navigation').mapBy('label')).to.deep.equal(['First', 'Second']);
        ctrl.send('deleteNavItem', ctrl.get('settings.navigation.firstObject'));
        (0, _chai.expect)(ctrl.get('settings.navigation').mapBy('label')).to.deep.equal(['Second']);
      });
    });
    (0, _mocha.it)('action - updateUrl: updates URL on navigationItem', function () {
      let ctrl = this.subject();
      let navItems = [_navigationItem.default.create({
        label: 'First',
        url: '/first'
      }), _navigationItem.default.create({
        label: 'Second',
        url: '/second',
        last: true
      })];
      Ember.run(() => {
        ctrl.set('settings', Ember.Object.create({
          navigation: navItems
        }));
        (0, _chai.expect)(ctrl.get('settings.navigation').mapBy('url')).to.deep.equal(['/first', '/second']);
        ctrl.send('updateUrl', '/new', ctrl.get('settings.navigation.firstObject'));
        (0, _chai.expect)(ctrl.get('settings.navigation').mapBy('url')).to.deep.equal(['/new', '/second']);
      });
    });
  });
});
define("ghost-admin/tests/unit/controllers/subscribers-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Controller: subscribers', function () {
    (0, _emberMocha.setupTest)('controller:subscribers', {
      needs: ['service:notifications', 'service:session']
    }); // Replace this with your real tests.

    (0, _mocha.it)('exists', function () {
      let controller = this.subject();
      (0, _chai.expect)(controller).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/helpers/gh-count-characters-test", ["ghost-admin/helpers/gh-count-characters", "mocha", "chai"], function (_ghCountCharacters, _mocha, _chai) {
  "use strict";

  (0, _mocha.describe)('Unit: Helper: gh-count-characters', function () {
    let defaultStyle = 'color: rgb(115, 138, 148);';
    let errorStyle = 'color: rgb(240, 82, 48);';
    (0, _mocha.it)('counts remaining chars', function () {
      let result = (0, _ghCountCharacters.countCharacters)(['test']);
      (0, _chai.expect)(result.string).to.equal("<span class=\"word-count\" style=\"".concat(defaultStyle, "\">196</span>"));
    });
    (0, _mocha.it)('warns when nearing limit', function () {
      let result = (0, _ghCountCharacters.countCharacters)([Array(195 + 1).join('x')]);
      (0, _chai.expect)(result.string).to.equal("<span class=\"word-count\" style=\"".concat(errorStyle, "\">5</span>"));
    });
    (0, _mocha.it)('indicates too many chars', function () {
      let result = (0, _ghCountCharacters.countCharacters)([Array(205 + 1).join('x')]);
      (0, _chai.expect)(result.string).to.equal("<span class=\"word-count\" style=\"".concat(errorStyle, "\">-5</span>"));
    });
    (0, _mocha.it)('counts multibyte correctly', function () {
      let result = (0, _ghCountCharacters.countCharacters)(['💩']);
      (0, _chai.expect)(result.string).to.equal("<span class=\"word-count\" style=\"".concat(defaultStyle, "\">199</span>")); // emoji + modifier is still two chars

      result = (0, _ghCountCharacters.countCharacters)(['💃🏻']);
      (0, _chai.expect)(result.string).to.equal("<span class=\"word-count\" style=\"".concat(defaultStyle, "\">198</span>"));
    });
  });
});
define("ghost-admin/tests/unit/helpers/gh-count-down-characters-test", ["ghost-admin/helpers/gh-count-down-characters", "mocha", "chai"], function (_ghCountDownCharacters, _mocha, _chai) {
  "use strict";

  (0, _mocha.describe)('Unit: Helper: gh-count-down-characters', function () {
    let validStyle = 'color: rgb(159, 187, 88);';
    let errorStyle = 'color: rgb(226, 84, 64);';
    (0, _mocha.it)('counts chars', function () {
      let result = (0, _ghCountDownCharacters.countDownCharacters)(['test', 200]);
      (0, _chai.expect)(result.string).to.equal("<span class=\"word-count\" style=\"".concat(validStyle, "\">4</span>"));
    });
    (0, _mocha.it)('warns with too many chars', function () {
      let result = (0, _ghCountDownCharacters.countDownCharacters)([Array(205 + 1).join('x'), 200]);
      (0, _chai.expect)(result.string).to.equal("<span class=\"word-count\" style=\"".concat(errorStyle, "\">205</span>"));
    });
    (0, _mocha.it)('counts multibyte correctly', function () {
      let result = (0, _ghCountDownCharacters.countDownCharacters)(['💩', 200]);
      (0, _chai.expect)(result.string).to.equal("<span class=\"word-count\" style=\"".concat(validStyle, "\">1</span>")); // emoji + modifier is still two chars

      result = (0, _ghCountDownCharacters.countDownCharacters)(['💃🏻', 200]);
      (0, _chai.expect)(result.string).to.equal("<span class=\"word-count\" style=\"".concat(validStyle, "\">2</span>"));
    });
  });
});
define("ghost-admin/tests/unit/helpers/gh-format-post-time-test", ["moment", "sinon", "mocha", "chai", "ember-mocha"], function (_moment, _sinon, _mocha, _chai, _emberMocha) {
  "use strict";

  // because why not?
  const timezoneForTest = 'Iceland';
  (0, _mocha.describe)('Unit: Helper: gh-format-post-time', function () {
    (0, _emberMocha.setupTest)('helper:gh-format-post-time', {
      unit: true,
      needs: ['service:settings']
    });

    let sandbox = _sinon.default.createSandbox();

    afterEach(function () {
      sandbox.restore();
    });

    function runFormatCheck(helper, date1, utc, options) {
      helper.set('settings', {
        activeTimezone: timezoneForTest
      });
      let mockDate = (0, _moment.default)(date1); // Compute this before we override utc

      let expectedTime = _moment.default.tz(mockDate, timezoneForTest).format('HH:mm');

      let utcStub = sandbox.stub(_moment.default, 'utc');
      utcStub.returns((0, _moment.default)(utc));
      utcStub.onFirstCall().returns(mockDate);
      let result = helper.compute([mockDate], options);
      return {
        expectedTime,
        result
      };
    }

    (0, _mocha.it)('returns basic time difference if post is draft', function () {
      let helper = this.subject();

      let mockDate = _moment.default.utc().subtract(1, 'hour');

      let result = helper.compute([mockDate], {
        draft: true
      });
      (0, _chai.expect)(result).to.equal('an hour ago');
    });
    (0, _mocha.it)('returns difference if post was published less than 15 minutes ago', function () {
      let helper = this.subject();

      let mockDate = _moment.default.utc().subtract(13, 'minutes');

      let result = helper.compute([mockDate], {
        published: true
      });
      (0, _chai.expect)(result).to.equal('13 minutes ago');
    });
    (0, _mocha.it)('returns difference if post is scheduled for less than 15 minutes from now', function () {
      let helper = this.subject();

      let mockDate = _moment.default.utc().add(13, 'minutes');

      let result = helper.compute([mockDate], {
        scheduled: true
      });
      (0, _chai.expect)(result).to.equal('in 13 minutes');
    });
    (0, _mocha.it)('returns correct format if post was published on the same day', function () {
      let _runFormatCheck = runFormatCheck(this.subject(), '2017-09-06T16:00:00Z', '2017-09-06T18:00:00Z', {
        published: true
      }),
          expectedTime = _runFormatCheck.expectedTime,
          result = _runFormatCheck.result;

      (0, _chai.expect)(result).to.equal("".concat(expectedTime, " Today"));
    });
    (0, _mocha.it)('returns correct format if post is scheduled for the same day', function () {
      let _runFormatCheck2 = runFormatCheck(this.subject(), '2017-09-06T18:00:00Z', '2017-09-06T16:00:00Z', {
        scheduled: true
      }),
          expectedTime = _runFormatCheck2.expectedTime,
          result = _runFormatCheck2.result;

      (0, _chai.expect)(result).to.equal("at ".concat(expectedTime, " Today"));
    });
    (0, _mocha.it)('returns correct format if post was published yesterday', function () {
      let _runFormatCheck3 = runFormatCheck(this.subject(), '2017-09-05T16:00:00Z', '2017-09-06T18:00:00Z', {
        published: true
      }),
          expectedTime = _runFormatCheck3.expectedTime,
          result = _runFormatCheck3.result;

      (0, _chai.expect)(result).to.equal("".concat(expectedTime, " Yesterday"));
    });
    (0, _mocha.it)('returns correct format if post is scheduled for tomorrow', function () {
      let _runFormatCheck4 = runFormatCheck(this.subject(), '2017-09-07T18:00:00Z', '2017-09-06T16:00:00Z', {
        scheduled: true
      }),
          expectedTime = _runFormatCheck4.expectedTime,
          result = _runFormatCheck4.result;

      (0, _chai.expect)(result).to.equal("at ".concat(expectedTime, " Tomorrow"));
    });
    (0, _mocha.it)('returns correct format if post was published prior to yesterday', function () {
      let _runFormatCheck5 = runFormatCheck(this.subject(), '2017-09-02T16:00:00Z', '2017-09-06T18:00:00Z', {
        published: true
      }),
          result = _runFormatCheck5.result;

      (0, _chai.expect)(result).to.equal('02 Sep 2017');
    });
    (0, _mocha.it)('returns correct format if post is scheduled for later than tomorrow', function () {
      let _runFormatCheck6 = runFormatCheck(this.subject(), '2017-09-10T18:00:00Z', '2017-09-06T16:00:00Z', {
        scheduled: true
      }),
          expectedTime = _runFormatCheck6.expectedTime,
          result = _runFormatCheck6.result;

      (0, _chai.expect)(result).to.equal("at ".concat(expectedTime, " on 10 Sep 2017"));
    });
  });
});
define("ghost-admin/tests/unit/helpers/gh-user-can-admin-test", ["mocha", "chai", "ghost-admin/helpers/gh-user-can-admin"], function (_mocha, _chai, _ghUserCanAdmin) {
  "use strict";

  (0, _mocha.describe)('Unit: Helper: gh-user-can-admin', function () {
    // Mock up roles and test for truthy
    (0, _mocha.describe)('Owner or admin roles', function () {
      let user = {
        get(role) {
          if (role === 'isOwnerOrAdmin') {
            return true;
          }
        }

      };
      (0, _mocha.it)(' - can be Admin', function () {
        let result = (0, _ghUserCanAdmin.ghUserCanAdmin)([user]);
        (0, _chai.expect)(result).to.equal(true);
      });
    });
    (0, _mocha.describe)('Editor, Author & Contributor roles', function () {
      let user = {
        get(role) {
          if (role === 'isOwner') {
            return false;
          } else if (role === 'isAdmin') {
            return false;
          }
        }

      };
      (0, _mocha.it)(' - cannot be Admin', function () {
        let result = (0, _ghUserCanAdmin.ghUserCanAdmin)([user]);
        (0, _chai.expect)(result).to.equal(false);
      });
    });
  });
});
define("ghost-admin/tests/unit/helpers/highlighted-text-test", ["mocha", "chai", "ghost-admin/helpers/highlighted-text"], function (_mocha, _chai, _highlightedText) {
  "use strict";

  (0, _mocha.describe)('Unit: Helper: highlighted-text', function () {
    (0, _mocha.it)('works', function () {
      let result = (0, _highlightedText.highlightedText)(['Test', 'e']);
      (0, _chai.expect)(result).to.be.an('object');
      (0, _chai.expect)(result.string).to.equal('T<span class="highlight">e</span>st');
    });
  });
});
define("ghost-admin/tests/unit/helpers/is-equal-test", ["mocha", "chai", "ghost-admin/helpers/is-equal"], function (_mocha, _chai, _isEqual) {
  "use strict";

  (0, _mocha.describe)('Unit: Helper: is-equal', function () {
    // Replace this with your real tests.
    (0, _mocha.it)('works', function () {
      let result = (0, _isEqual.isEqual)([42, 42]);
      (0, _chai.expect)(result).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/helpers/is-not-test", ["mocha", "chai", "ghost-admin/helpers/is-not"], function (_mocha, _chai, _isNot) {
  "use strict";

  (0, _mocha.describe)('Unit: Helper: is-not', function () {
    // Replace this with your real tests.
    (0, _mocha.it)('works', function () {
      let result = (0, _isNot.isNot)(false);
      (0, _chai.expect)(result).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/mixins/validation-engine-test", ["mocha"], function (_mocha) {
  "use strict";

  // import {expect} from 'chai';
  // import EmberObject from 'ember-object';
  // import ValidationEngineMixin from 'ghost-admin/mixins/validation-engine';
  (0, _mocha.describe)('ValidationEngineMixin', function () {
    // Replace this with your real tests.
    // it('works', function () {
    //     var ValidationEngineObject = EmberObject.extend(ValidationEngineMixin);
    //     var subject = ValidationEngineObject.create();
    //     expect(subject).to.be.ok;
    // });
    (0, _mocha.describe)('#validate', function () {
      (0, _mocha.it)('loads the correct validator');
      (0, _mocha.it)('rejects if the validator doesn\'t exist');
      (0, _mocha.it)('resolves with valid object');
      (0, _mocha.it)('rejects with invalid object');
      (0, _mocha.it)('clears all existing errors');
      (0, _mocha.describe)('with a specified property', function () {
        (0, _mocha.it)('resolves with valid property');
        (0, _mocha.it)('rejects with invalid property');
        (0, _mocha.it)('adds property to hasValidated array');
        (0, _mocha.it)('clears existing error on specified property');
      });
      (0, _mocha.it)('handles a passed in model');
      (0, _mocha.it)('uses this.model if available');
    });
    (0, _mocha.describe)('#save', function () {
      (0, _mocha.it)('calls validate');
      (0, _mocha.it)('rejects with validation errors');
      (0, _mocha.it)('calls object\'s #save if validation passes');
      (0, _mocha.it)('skips validation if it\'s a deletion');
    });
  });
});
define("ghost-admin/tests/unit/models/api-key-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: api-key', function () {
    (0, _emberMocha.setupModelTest)('api-key', {
      // Specify the other units that are required for this test.
      needs: []
    }); // Replace this with your real tests.

    (0, _mocha.it)('exists', function () {
      let model = this.subject(); // var store = this.store();

      (0, _chai.expect)(model).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/models/integration-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: integration', function () {
    (0, _emberMocha.setupModelTest)('integration', {
      // Specify the other units that are required for this test.
      needs: []
    }); // Replace this with your real tests.

    (0, _mocha.it)('exists', function () {
      let model = this.subject(); // var store = this.store();

      (0, _chai.expect)(model).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/models/invite-test", ["pretender", "mocha", "chai", "ember-mocha"], function (_pretender, _mocha, _chai, _emberMocha) {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  (0, _mocha.describe)('Unit: Model: invite', function () {
    (0, _emberMocha.setupModelTest)('invite', {
      needs: ['model:role', 'serializer:application', 'serializer:invite', 'transform:moment-utc', 'service:ghost-paths', 'service:ajax', 'service:session', 'service:feature', 'service:tour']
    });
    (0, _mocha.describe)('with network', function () {
      let server;
      beforeEach(function () {
        server = new _pretender.default();
      });
      afterEach(function () {
        server.shutdown();
      });
      (0, _mocha.it)('resend hits correct endpoint', function () {
        let model = this.subject();
        let role;
        server.post('/ghost/api/v2/admin/invites/', function () {
          return [200, {}, '{}'];
        });
        Ember.run(() => {
          role = this.store().push({
            data: {
              id: 1,
              type: 'role',
              attributes: {
                name: 'Editor'
              }
            }
          });
          model.set('email', 'resend-test@example.com');
          model.set('role', role);
          model.resend();
        });
        (0, _chai.expect)(server.handledRequests.length, 'number of requests').to.equal(1);

        let _server$handledReques = _slicedToArray(server.handledRequests, 1),
            lastRequest = _server$handledReques[0];

        let requestBody = JSON.parse(lastRequest.requestBody);

        let _requestBody$invites = _slicedToArray(requestBody.invites, 1),
            invite = _requestBody$invites[0];

        (0, _chai.expect)(requestBody.invites.length, 'number of invites in request body').to.equal(1);
        (0, _chai.expect)(invite.email).to.equal('resend-test@example.com'); // eslint-disable-next-line camelcase

        (0, _chai.expect)(invite.role_id, 'role ID').to.equal('1');
      });
    });
  });
});
define("ghost-admin/tests/unit/models/member-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: member', function () {
    (0, _emberMocha.setupTest)(); // Replace this with your real tests.

    (0, _mocha.it)('exists', function () {
      let store = this.owner.lookup('service:store');
      let model = store.createRecord('member', {});
      (0, _chai.expect)(model).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/models/navigation-item-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: navigation-item', function () {
    (0, _emberMocha.setupTest)('model:navigation-item', {
      // Specify the other units that are required for this test.
      needs: []
    });
    (0, _mocha.it)('isComplete is true when label and url are filled', function () {
      let model = this.subject();
      model.set('label', 'test');
      model.set('url', 'test');
      (0, _chai.expect)(model.get('isComplete')).to.be.true;
    });
    (0, _mocha.it)('isComplete is false when label is blank', function () {
      let model = this.subject();
      model.set('label', '');
      model.set('url', 'test');
      (0, _chai.expect)(model.get('isComplete')).to.be.false;
    });
    (0, _mocha.it)('isComplete is false when url is blank', function () {
      let model = this.subject();
      model.set('label', 'test');
      model.set('url', '');
      (0, _chai.expect)(model.get('isComplete')).to.be.false;
    });
    (0, _mocha.it)('isBlank is true when label and url are blank', function () {
      let model = this.subject();
      model.set('label', '');
      model.set('url', '');
      (0, _chai.expect)(model.get('isBlank')).to.be.true;
    });
    (0, _mocha.it)('isBlank is false when label is present', function () {
      let model = this.subject();
      model.set('label', 'test');
      model.set('url', '');
      (0, _chai.expect)(model.get('isBlank')).to.be.false;
    });
    (0, _mocha.it)('isBlank is false when url is present', function () {
      let model = this.subject();
      model.set('label', '');
      model.set('url', 'test');
      (0, _chai.expect)(model.get('isBlank')).to.be.false;
    });
  });
});
define("ghost-admin/tests/unit/models/post-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: post', function () {
    (0, _emberMocha.setupModelTest)('post', {
      needs: ['model:user', 'model:tag', 'model:role', 'service:ajax', 'service:clock', 'service:config', 'service:feature', 'service:ghostPaths', 'service:lazyLoader', 'service:notifications', 'service:session', 'service:settings']
    });
    (0, _mocha.it)('has a validation type of "post"', function () {
      let model = this.subject();
      (0, _chai.expect)(model.validationType).to.equal('post');
    });
    (0, _mocha.it)('isPublished, isDraft and isScheduled are correct', function () {
      let model = this.subject({
        status: 'published'
      });
      (0, _chai.expect)(model.get('isPublished')).to.be.ok;
      (0, _chai.expect)(model.get('isDraft')).to.not.be.ok;
      (0, _chai.expect)(model.get('isScheduled')).to.not.be.ok;
      Ember.run(function () {
        model.set('status', 'draft');
        (0, _chai.expect)(model.get('isPublished')).to.not.be.ok;
        (0, _chai.expect)(model.get('isDraft')).to.be.ok;
        (0, _chai.expect)(model.get('isScheduled')).to.not.be.ok;
      });
      Ember.run(function () {
        model.set('status', 'scheduled');
        (0, _chai.expect)(model.get('isScheduled')).to.be.ok;
        (0, _chai.expect)(model.get('isPublished')).to.not.be.ok;
        (0, _chai.expect)(model.get('isDraft')).to.not.be.ok;
      });
    });
    (0, _mocha.it)('isAuthoredByUser is correct', function () {
      let user1 = this.store().createRecord('user', {
        id: 'abcd1234'
      });
      let user2 = this.store().createRecord('user', {
        id: 'wxyz9876'
      });
      let model = this.subject({
        authors: [user1]
      });
      (0, _chai.expect)(model.isAuthoredByUser(user1)).to.be.ok;
      Ember.run(function () {
        model.set('authors', [user2]);
        (0, _chai.expect)(model.isAuthoredByUser(user1)).to.not.be.ok;
      });
    });
    (0, _mocha.it)('updateTags removes and deletes old tags', function () {
      let model = this.subject();
      Ember.run(this, function () {
        let modelTags = model.get('tags');
        let tag1 = this.store().createRecord('tag', {
          id: '1'
        });
        let tag2 = this.store().createRecord('tag', {
          id: '2'
        });
        let tag3 = this.store().createRecord('tag'); // During testing a record created without an explicit id will get
        // an id of 'fixture-n' instead of null

        tag3.set('id', null);
        modelTags.pushObject(tag1);
        modelTags.pushObject(tag2);
        modelTags.pushObject(tag3);
        (0, _chai.expect)(model.get('tags.length')).to.equal(3);
        model.updateTags();
        (0, _chai.expect)(model.get('tags.length')).to.equal(2);
        (0, _chai.expect)(model.get('tags.firstObject.id')).to.equal('1');
        (0, _chai.expect)(model.get('tags').objectAt(1).get('id')).to.equal('2');
        (0, _chai.expect)(tag1.get('isDeleted')).to.not.be.ok;
        (0, _chai.expect)(tag2.get('isDeleted')).to.not.be.ok;
        (0, _chai.expect)(tag3.get('isDeleted')).to.be.ok;
      });
    });
  });
});
define("ghost-admin/tests/unit/models/role-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: role', function () {
    (0, _emberMocha.setupModelTest)('role', {
      needs: ['service:ajax']
    });
    (0, _mocha.it)('provides a lowercase version of the name', function () {
      let model = this.subject({
        name: 'Author'
      });
      (0, _chai.expect)(model.get('name')).to.equal('Author');
      (0, _chai.expect)(model.get('lowerCaseName')).to.equal('author');
      Ember.run(function () {
        model.set('name', 'Editor');
        (0, _chai.expect)(model.get('name')).to.equal('Editor');
        (0, _chai.expect)(model.get('lowerCaseName')).to.equal('editor');
      });
    });
  });
});
define("ghost-admin/tests/unit/models/setting-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: setting', function () {
    (0, _emberMocha.setupModelTest)('setting');
    (0, _mocha.it)('has a validation type of "setting"', function () {
      let model = this.subject();
      (0, _chai.expect)(model.get('validationType')).to.equal('setting');
    });
  });
});
define("ghost-admin/tests/unit/models/subscriber-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: subscriber', function () {
    (0, _emberMocha.setupModelTest)('subscriber', {
      // Specify the other units that are required for this test.
      needs: ['model:post', 'service:session']
    }); // Replace this with your real tests.

    (0, _mocha.it)('exists', function () {
      let model = this.subject(); // var store = this.store();

      (0, _chai.expect)(model).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/models/tag-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: tag', function () {
    (0, _emberMocha.setupModelTest)('tag', {
      needs: ['service:feature']
    });
    (0, _mocha.it)('has a validation type of "tag"', function () {
      let model = this.subject();
      (0, _chai.expect)(model.get('validationType')).to.equal('tag');
    });
  });
});
define("ghost-admin/tests/unit/models/user-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: user', function () {
    (0, _emberMocha.setupModelTest)('user', {
      needs: ['model:role', 'serializer:application', 'serializer:user', 'service:ajax', 'service:config', 'service:ghostPaths', 'service:notifications', 'service:session']
    });
    (0, _mocha.it)('has a validation type of "user"', function () {
      let model = this.subject();
      (0, _chai.expect)(model.get('validationType')).to.equal('user');
    });
    (0, _mocha.it)('isActive/isSuspended properties are correct', function () {
      let model = this.subject({
        status: 'active'
      });
      (0, _chai.expect)(model.get('isActive')).to.be.ok;
      (0, _chai.expect)(model.get('isSuspended')).to.not.be.ok;
      ['warn-1', 'warn-2', 'warn-3', 'warn-4', 'locked'].forEach(function (status) {
        Ember.run(() => {
          model.set('status', status);
        });
        (0, _chai.expect)(model.get('isActive')).to.be.ok;
        (0, _chai.expect)(model.get('isSuspended')).to.not.be.ok;
      });
      Ember.run(() => {
        model.set('status', 'inactive');
      });
      (0, _chai.expect)(model.get('isSuspended')).to.be.ok;
      (0, _chai.expect)(model.get('isActive')).to.not.be.ok;
    });
    (0, _mocha.it)('role property is correct', function () {
      let model = this.subject();
      Ember.run(() => {
        let role = this.store().push({
          data: {
            id: 1,
            type: 'role',
            attributes: {
              name: 'Author'
            }
          }
        });
        model.get('roles').pushObject(role);
      });
      (0, _chai.expect)(model.get('role.name')).to.equal('Author');
      Ember.run(() => {
        let role = this.store().push({
          data: {
            id: 1,
            type: 'role',
            attributes: {
              name: 'Editor'
            }
          }
        });
        model.set('role', role);
      });
      (0, _chai.expect)(model.get('role.name')).to.equal('Editor');
    });
    (0, _mocha.it)('isContributor property is correct', function () {
      let model = this.subject();
      Ember.run(() => {
        let role = this.store().push({
          data: {
            id: 1,
            type: 'role',
            attributes: {
              name: 'Contributor'
            }
          }
        });
        model.set('role', role);
      });
      (0, _chai.expect)(model.get('isContributor')).to.be.ok;
      (0, _chai.expect)(model.get('isAuthorOrContributor')).to.be.ok;
      (0, _chai.expect)(model.get('isAuthor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isEditor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isAdmin')).to.not.be.ok;
      (0, _chai.expect)(model.get('isOwner')).to.not.be.ok;
    });
    (0, _mocha.it)('isAuthor property is correct', function () {
      let model = this.subject();
      Ember.run(() => {
        let role = this.store().push({
          data: {
            id: 1,
            type: 'role',
            attributes: {
              name: 'Author'
            }
          }
        });
        model.set('role', role);
      });
      (0, _chai.expect)(model.get('isAuthor')).to.be.ok;
      (0, _chai.expect)(model.get('isContributor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isAuthorOrContributor')).to.be.ok;
      (0, _chai.expect)(model.get('isEditor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isAdmin')).to.not.be.ok;
      (0, _chai.expect)(model.get('isOwner')).to.not.be.ok;
    });
    (0, _mocha.it)('isEditor property is correct', function () {
      let model = this.subject();
      Ember.run(() => {
        let role = this.store().push({
          data: {
            id: 1,
            type: 'role',
            attributes: {
              name: 'Editor'
            }
          }
        });
        model.set('role', role);
      });
      (0, _chai.expect)(model.get('isEditor')).to.be.ok;
      (0, _chai.expect)(model.get('isAuthor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isContributor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isAuthorOrContributor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isAdmin')).to.not.be.ok;
      (0, _chai.expect)(model.get('isOwner')).to.not.be.ok;
    });
    (0, _mocha.it)('isAdmin property is correct', function () {
      let model = this.subject();
      Ember.run(() => {
        let role = this.store().push({
          data: {
            id: 1,
            type: 'role',
            attributes: {
              name: 'Administrator'
            }
          }
        });
        model.set('role', role);
      });
      (0, _chai.expect)(model.get('isAdmin')).to.be.ok;
      (0, _chai.expect)(model.get('isAuthor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isContributor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isAuthorOrContributor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isEditor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isOwner')).to.not.be.ok;
    });
    (0, _mocha.it)('isOwner property is correct', function () {
      let model = this.subject();
      Ember.run(() => {
        let role = this.store().push({
          data: {
            id: 1,
            type: 'role',
            attributes: {
              name: 'Owner'
            }
          }
        });
        model.set('role', role);
      });
      (0, _chai.expect)(model.get('isOwner')).to.be.ok;
      (0, _chai.expect)(model.get('isAuthor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isContributor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isAuthorOrContributor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isAdmin')).to.not.be.ok;
      (0, _chai.expect)(model.get('isEditor')).to.not.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/models/webhook-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: webhook', function () {
    (0, _emberMocha.setupModelTest)('webhook', {
      // Specify the other units that are required for this test.
      needs: []
    }); // Replace this with your real tests.

    (0, _mocha.it)('exists', function () {
      let model = this.subject(); // var store = this.store();

      (0, _chai.expect)(model).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/serializers/api-key-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Serializer: api-key', function () {
    (0, _emberMocha.setupModelTest)('api-key', {
      // Specify the other units that are required for this test.
      needs: ['serializer:api-key', 'model:integration', 'transform:moment-utc']
    }); // Replace this with your real tests.

    (0, _mocha.it)('serializes records', function () {
      let record = this.subject();
      let serializedRecord = record.serialize();
      (0, _chai.expect)(serializedRecord).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/serializers/integration-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Serializer: integration', function () {
    (0, _emberMocha.setupModelTest)('integration', {
      // Specify the other units that are required for this test.
      needs: ['serializer:integration', 'transform:moment-utc', 'model:api-key', 'model:webhook']
    }); // Replace this with your real tests.

    (0, _mocha.it)('serializes records', function () {
      let record = this.subject();
      let serializedRecord = record.serialize();
      (0, _chai.expect)(serializedRecord).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/serializers/notification-test", ["pretender", "mocha", "chai", "ember-mocha"], function (_pretender, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Serializer: notification', function () {
    (0, _emberMocha.setupModelTest)('notification', {
      // Specify the other units that are required for this test.
      needs: ['serializer:notification']
    });
    let server;
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('converts location->key when deserializing', function () {
      server.get('/notifications', function () {
        let response = {
          notifications: [{
            id: 1,
            dismissible: false,
            status: 'alert',
            type: 'info',
            location: 'test.foo',
            message: 'This is a test'
          }]
        };
        return [200, {
          'Content-Type': 'application/json'
        }, JSON.stringify(response)];
      });
      return this.store().findAll('notification').then(notifications => {
        (0, _chai.expect)(notifications.get('length')).to.equal(1);
        (0, _chai.expect)(notifications.get('firstObject.key')).to.equal('test.foo');
      });
    });
  });
});
define("ghost-admin/tests/unit/serializers/post-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Serializer: post', function () {
    (0, _emberMocha.setupModelTest)('post', {
      // Specify the other units that are required for this test.
      needs: ['transform:moment-utc', 'transform:json-string', 'model:user', 'model:tag', 'service:ajax', 'service:clock', 'service:config', 'service:feature', 'service:ghostPaths', 'service:lazyLoader', 'service:notifications', 'service:session', 'service:settings']
    }); // Replace this with your real tests.

    (0, _mocha.it)('serializes records', function () {
      let record = this.subject();
      let serializedRecord = record.serialize();
      (0, _chai.expect)(serializedRecord).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/serializers/role-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit:Serializer: role', function () {
    (0, _emberMocha.setupModelTest)('role', {
      // Specify the other units that are required for this test.
      needs: ['transform:moment-utc']
    }); // Replace this with your real tests.

    (0, _mocha.it)('serializes records', function () {
      let record = this.subject();
      let serializedRecord = record.serialize();
      (0, _chai.expect)(serializedRecord).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/serializers/setting-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit:Serializer: setting', function () {
    (0, _emberMocha.setupModelTest)('setting', {
      // Specify the other units that are required for this test.
      needs: ['transform:moment-utc', 'transform:facebook-url-user', 'transform:twitter-url-user', 'transform:navigation-settings', 'transform:slack-settings', 'transform:unsplash-settings']
    }); // Replace this with your real tests.

    (0, _mocha.it)('serializes records', function () {
      let record = this.subject();
      let serializedRecord = record.serialize();
      (0, _chai.expect)(serializedRecord).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/serializers/subscriber-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit:Serializer: subscriber', function () {
    (0, _emberMocha.setupModelTest)('subscriber', {
      // Specify the other units that are required for this test.
      needs: ['model:post', 'transform:moment-utc']
    }); // Replace this with your real tests.

    (0, _mocha.it)('serializes records', function () {
      let record = this.subject();
      let serializedRecord = record.serialize();
      (0, _chai.expect)(serializedRecord).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/serializers/tag-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Serializer: tag', function () {
    (0, _emberMocha.setupModelTest)('tag', {
      // Specify the other units that are required for this test.
      needs: ['service:feature', 'transform:moment-utc', 'transform:raw']
    }); // Replace this with your real tests.

    (0, _mocha.it)('serializes records', function () {
      let record = this.subject();
      let serializedRecord = record.serialize();
      (0, _chai.expect)(serializedRecord).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/serializers/user-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Serializer: user', function () {
    (0, _emberMocha.setupModelTest)('user', {
      // Specify the other units that are required for this test.
      needs: ['model:role', 'service:ajax', 'service:config', 'service:ghostPaths', 'service:notifications', 'service:session', 'transform:facebook-url-user', 'transform:json-string', 'transform:moment-utc', 'transform:raw', 'transform:twitter-url-user']
    }); // Replace this with your real tests.

    (0, _mocha.it)('serializes records', function () {
      let record = this.subject();
      let serializedRecord = record.serialize();
      (0, _chai.expect)(serializedRecord).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/serializers/webhook-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Serializer: webhook', function () {
    (0, _emberMocha.setupModelTest)('webhook', {
      // Specify the other units that are required for this test.
      needs: ['transform:moment-utc', 'serializer:webhook', 'model:integration']
    }); // Replace this with your real tests.

    (0, _mocha.it)('serializes records', function () {
      let record = this.subject();
      let serializedRecord = record.serialize();
      (0, _chai.expect)(serializedRecord).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/services/event-bus-test", ["sinon", "mocha", "chai", "ember-mocha"], function (_sinon, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Service: event-bus', function () {
    (0, _emberMocha.setupTest)('service:event-bus', {});
    (0, _mocha.it)('works', function () {
      let service = this.subject();

      let eventHandler = _sinon.default.spy();

      service.subscribe('test-event', eventHandler);
      service.publish('test-event', 'test');
      service.unsubscribe('test-event', eventHandler);
      service.publish('test-event', 'test two');
      (0, _chai.expect)(eventHandler.calledOnce, 'event handler only triggered once').to.be.true;
      (0, _chai.expect)(eventHandler.calledWith('test'), 'event handler was passed correct arguments').to.be.true;
    });
  });
});
define("ghost-admin/tests/unit/services/notifications-test", ["sinon", "ember-ajax/errors", "ghost-admin/services/ajax", "mocha", "chai", "ember-mocha"], function (_sinon, _errors, _ajax, _mocha, _chai, _emberMocha) {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  (0, _mocha.describe)('Unit: Service: notifications', function () {
    (0, _emberMocha.setupTest)('service:notifications', {
      needs: ['service:upgradeStatus']
    });
    beforeEach(function () {
      this.subject().set('content', Ember.A());
      this.subject().set('delayedNotifications', Ember.A());
    });
    (0, _mocha.it)('filters alerts/notifications', function () {
      let notifications = this.subject(); // wrapped in run-loop to enure alerts/notifications CPs are updated

      Ember.run(() => {
        notifications.showAlert('Alert');
        notifications.showNotification('Notification');
      });
      (0, _chai.expect)(notifications.get('alerts.length')).to.equal(1);
      (0, _chai.expect)(notifications.get('alerts.firstObject.message')).to.equal('Alert');
      (0, _chai.expect)(notifications.get('notifications.length')).to.equal(1);
      (0, _chai.expect)(notifications.get('notifications.firstObject.message')).to.equal('Notification');
    });
    (0, _mocha.it)('#handleNotification deals with DS.Notification notifications', function () {
      let notifications = this.subject();
      let notification = Ember.Object.create({
        message: '<h1>Test</h1>',
        status: 'alert'
      });

      notification.toJSON = function () {};

      notifications.handleNotification(notification);
      notification = notifications.get('alerts')[0]; // alerts received from the server should be marked html safe

      (0, _chai.expect)(notification.get('message')).to.have.property('toHTML');
    });
    (0, _mocha.it)('#handleNotification defaults to notification if no status supplied', function () {
      let notifications = this.subject();
      notifications.handleNotification({
        message: 'Test'
      }, false);
      (0, _chai.expect)(notifications.get('content')).to.deep.include({
        message: 'Test',
        status: 'notification'
      });
    });
    (0, _mocha.it)('#showAlert adds POJO alerts', function () {
      let notifications = this.subject();
      Ember.run(() => {
        notifications.showAlert('Test Alert', {
          type: 'error'
        });
      });
      (0, _chai.expect)(notifications.get('alerts')).to.deep.include({
        message: 'Test Alert',
        status: 'alert',
        type: 'error',
        key: undefined
      });
    });
    (0, _mocha.it)('#showAlert adds delayed notifications', function () {
      let notifications = this.subject();
      Ember.run(() => {
        notifications.showNotification('Test Alert', {
          type: 'error',
          delayed: true
        });
      });
      (0, _chai.expect)(notifications.get('delayedNotifications')).to.deep.include({
        message: 'Test Alert',
        status: 'notification',
        type: 'error',
        key: undefined
      });
    }); // in order to cater for complex keys that are suitable for i18n
    // we split on the second period and treat the resulting base as
    // the key for duplicate checking

    (0, _mocha.it)('#showAlert clears duplicates using keys', function () {
      let notifications = this.subject();
      Ember.run(() => {
        notifications.showAlert('Kept');
        notifications.showAlert('Duplicate', {
          key: 'duplicate.key.fail'
        });
      });
      (0, _chai.expect)(notifications.get('alerts.length')).to.equal(2);
      Ember.run(() => {
        notifications.showAlert('Duplicate with new message', {
          key: 'duplicate.key.success'
        });
      });
      (0, _chai.expect)(notifications.get('alerts.length')).to.equal(2);
      (0, _chai.expect)(notifications.get('alerts.lastObject.message')).to.equal('Duplicate with new message');
    });
    (0, _mocha.it)('#showAlert clears duplicates using message text', function () {
      let notifications = this.subject();
      notifications.showAlert('Not duplicate');
      notifications.showAlert('Duplicate', {
        key: 'duplicate'
      });
      notifications.showAlert('Duplicate');
      (0, _chai.expect)(notifications.get('alerts.length')).to.equal(2);
      (0, _chai.expect)(notifications.get('alerts.lastObject.key')).to.not.exist;
    });
    (0, _mocha.it)('#showNotification adds POJO notifications', function () {
      let notifications = this.subject();
      Ember.run(() => {
        notifications.showNotification('Test Notification', {
          type: 'success'
        });
      });
      (0, _chai.expect)(notifications.get('notifications')).to.deep.include({
        message: 'Test Notification',
        status: 'notification',
        type: 'success',
        key: undefined
      });
    });
    (0, _mocha.it)('#showNotification adds delayed notifications', function () {
      let notifications = this.subject();
      Ember.run(() => {
        notifications.showNotification('Test Notification', {
          delayed: true
        });
      });
      (0, _chai.expect)(notifications.get('delayedNotifications')).to.deep.include({
        message: 'Test Notification',
        status: 'notification',
        type: undefined,
        key: undefined
      });
    });
    (0, _mocha.it)('#showNotification clears existing notifications', function () {
      let notifications = this.subject();
      Ember.run(() => {
        notifications.showNotification('First');
        notifications.showNotification('Second');
      });
      (0, _chai.expect)(notifications.get('notifications.length')).to.equal(1);
      (0, _chai.expect)(notifications.get('notifications')).to.deep.equal([{
        message: 'Second',
        status: 'notification',
        type: undefined,
        key: undefined
      }]);
    });
    (0, _mocha.it)('#showNotification keeps existing notifications if doNotCloseNotifications option passed', function () {
      let notifications = this.subject();
      Ember.run(() => {
        notifications.showNotification('First');
        notifications.showNotification('Second', {
          doNotCloseNotifications: true
        });
      });
      (0, _chai.expect)(notifications.get('notifications.length')).to.equal(2);
    });
    (0, _mocha.it)('#showAPIError handles single json response error', function () {
      let notifications = this.subject();
      let error = new _errors.AjaxError({
        errors: [{
          message: 'Single error'
        }]
      });
      Ember.run(() => {
        notifications.showAPIError(error);
      });
      let alert = notifications.get('alerts.firstObject');
      (0, _chai.expect)(Ember.get(alert, 'message')).to.equal('Single error');
      (0, _chai.expect)(Ember.get(alert, 'status')).to.equal('alert');
      (0, _chai.expect)(Ember.get(alert, 'type')).to.equal('error');
      (0, _chai.expect)(Ember.get(alert, 'key')).to.equal('api-error');
    });
    (0, _mocha.it)('#showAPIError handles multiple json response errors', function () {
      let notifications = this.subject();
      let error = new _errors.AjaxError({
        errors: [{
          title: 'First error',
          message: 'First error message'
        }, {
          title: 'Second error',
          message: 'Second error message'
        }]
      });
      Ember.run(() => {
        notifications.showAPIError(error);
      });
      (0, _chai.expect)(notifications.get('alerts.length')).to.equal(2);

      let _notifications$get = notifications.get('alerts'),
          _notifications$get2 = _slicedToArray(_notifications$get, 2),
          alert1 = _notifications$get2[0],
          alert2 = _notifications$get2[1];

      (0, _chai.expect)(alert1).to.deep.equal({
        message: 'First error message',
        status: 'alert',
        type: 'error',
        key: 'api-error.first-error'
      });
      (0, _chai.expect)(alert2).to.deep.equal({
        message: 'Second error message',
        status: 'alert',
        type: 'error',
        key: 'api-error.second-error'
      });
    });
    (0, _mocha.it)('#showAPIError displays default error text if response has no error/message', function () {
      let notifications = this.subject();
      let resp = false;
      Ember.run(() => {
        notifications.showAPIError(resp);
      });
      (0, _chai.expect)(notifications.get('content').toArray()).to.deep.equal([{
        message: 'There was a problem on the server, please try again.',
        status: 'alert',
        type: 'error',
        key: 'api-error'
      }]);
      notifications.set('content', Ember.A());
      Ember.run(() => {
        notifications.showAPIError(resp, {
          defaultErrorText: 'Overridden default'
        });
      });
      (0, _chai.expect)(notifications.get('content').toArray()).to.deep.equal([{
        message: 'Overridden default',
        status: 'alert',
        type: 'error',
        key: 'api-error'
      }]);
    });
    (0, _mocha.it)('#showAPIError sets correct key when passed a base key', function () {
      let notifications = this.subject();
      Ember.run(() => {
        notifications.showAPIError('Test', {
          key: 'test.alert'
        });
      });
      (0, _chai.expect)(notifications.get('alerts.firstObject.key')).to.equal('api-error.test.alert');
    });
    (0, _mocha.it)('#showAPIError sets correct key when not passed a key', function () {
      let notifications = this.subject();
      Ember.run(() => {
        notifications.showAPIError('Test');
      });
      (0, _chai.expect)(notifications.get('alerts.firstObject.key')).to.equal('api-error');
    });
    (0, _mocha.it)('#showAPIError parses default ember-ajax errors correctly', function () {
      let notifications = this.subject();
      let error = new _errors.InvalidError();
      Ember.run(() => {
        notifications.showAPIError(error);
      });
      let notification = notifications.get('alerts.firstObject');
      (0, _chai.expect)(Ember.get(notification, 'message')).to.equal('Request was rejected because it was invalid');
      (0, _chai.expect)(Ember.get(notification, 'status')).to.equal('alert');
      (0, _chai.expect)(Ember.get(notification, 'type')).to.equal('error');
      (0, _chai.expect)(Ember.get(notification, 'key')).to.equal('api-error');
    });
    (0, _mocha.it)('#showAPIError parses custom ember-ajax errors correctly', function () {
      let notifications = this.subject();
      let error = new _ajax.ServerUnreachableError();
      Ember.run(() => {
        notifications.showAPIError(error);
      });
      let notification = notifications.get('alerts.firstObject');
      (0, _chai.expect)(Ember.get(notification, 'message')).to.equal('Server was unreachable');
      (0, _chai.expect)(Ember.get(notification, 'status')).to.equal('alert');
      (0, _chai.expect)(Ember.get(notification, 'type')).to.equal('error');
      (0, _chai.expect)(Ember.get(notification, 'key')).to.equal('api-error');
    });
    (0, _mocha.it)('#showAPIError adds error context to message if available', function () {
      let notifications = this.subject();
      let error = new _errors.AjaxError({
        errors: [{
          message: 'Authorization Error.',
          context: 'Please sign in.'
        }]
      });
      Ember.run(() => {
        notifications.showAPIError(error);
      });
      let alert = notifications.get('alerts.firstObject');
      (0, _chai.expect)(Ember.get(alert, 'message')).to.equal('Authorization Error. Please sign in.');
      (0, _chai.expect)(Ember.get(alert, 'status')).to.equal('alert');
      (0, _chai.expect)(Ember.get(alert, 'type')).to.equal('error');
      (0, _chai.expect)(Ember.get(alert, 'key')).to.equal('api-error');
    });
    (0, _mocha.it)('#displayDelayed moves delayed notifications into content', function () {
      let notifications = this.subject();
      Ember.run(() => {
        notifications.showNotification('First', {
          delayed: true
        });
        notifications.showNotification('Second', {
          delayed: true
        });
        notifications.showNotification('Third', {
          delayed: false
        });
        notifications.displayDelayed();
      });
      (0, _chai.expect)(notifications.get('notifications')).to.deep.equal([{
        message: 'Third',
        status: 'notification',
        type: undefined,
        key: undefined
      }, {
        message: 'First',
        status: 'notification',
        type: undefined,
        key: undefined
      }, {
        message: 'Second',
        status: 'notification',
        type: undefined,
        key: undefined
      }]);
    });
    (0, _mocha.it)('#closeNotification removes POJO notifications', function () {
      let notification = {
        message: 'Close test',
        status: 'notification'
      };
      let notifications = this.subject();
      Ember.run(() => {
        notifications.handleNotification(notification);
      });
      (0, _chai.expect)(notifications.get('notifications')).to.include(notification);
      Ember.run(() => {
        notifications.closeNotification(notification);
      });
      (0, _chai.expect)(notifications.get('notifications')).to.not.include(notification);
    });
    (0, _mocha.it)('#closeNotification removes and deletes DS.Notification records', function () {
      let notification = Ember.Object.create({
        message: 'Close test',
        status: 'alert'
      });
      let notifications = this.subject();

      notification.toJSON = function () {};

      notification.deleteRecord = function () {};

      _sinon.default.spy(notification, 'deleteRecord');

      notification.save = function () {
        return {
          finally(callback) {
            return callback(notification);
          }

        };
      };

      _sinon.default.spy(notification, 'save');

      Ember.run(() => {
        notifications.handleNotification(notification);
      });
      (0, _chai.expect)(notifications.get('alerts')).to.include(notification);
      Ember.run(() => {
        notifications.closeNotification(notification);
      });
      (0, _chai.expect)(notification.deleteRecord.calledOnce).to.be.true;
      (0, _chai.expect)(notification.save.calledOnce).to.be.true;
      (0, _chai.expect)(notifications.get('alerts')).to.not.include(notification);
    });
    (0, _mocha.it)('#closeNotifications only removes notifications', function () {
      let notifications = this.subject();
      Ember.run(() => {
        notifications.showAlert('First alert');
        notifications.showNotification('First notification');
        notifications.showNotification('Second notification', {
          doNotCloseNotifications: true
        });
      });
      (0, _chai.expect)(notifications.get('alerts.length'), 'alerts count').to.equal(1);
      (0, _chai.expect)(notifications.get('notifications.length'), 'notifications count').to.equal(2);
      Ember.run(() => {
        notifications.closeNotifications();
      });
      (0, _chai.expect)(notifications.get('alerts.length'), 'alerts count').to.equal(1);
      (0, _chai.expect)(notifications.get('notifications.length'), 'notifications count').to.equal(0);
    });
    (0, _mocha.it)('#closeNotifications only closes notifications with specified key', function () {
      let notifications = this.subject();
      Ember.run(() => {
        notifications.showAlert('First alert'); // using handleNotification as showNotification will auto-prune
        // duplicates and keys will be removed if doNotCloseNotifications
        // is true

        notifications.handleNotification({
          message: 'First notification',
          key: 'test.close',
          status: 'notification'
        });
        notifications.handleNotification({
          message: 'Second notification',
          key: 'test.keep',
          status: 'notification'
        });
        notifications.handleNotification({
          message: 'Third notification',
          key: 'test.close',
          status: 'notification'
        });
      });
      Ember.run(() => {
        notifications.closeNotifications('test.close');
      });
      (0, _chai.expect)(notifications.get('notifications.length'), 'notifications count').to.equal(1);
      (0, _chai.expect)(notifications.get('notifications.firstObject.message'), 'notification message').to.equal('Second notification');
      (0, _chai.expect)(notifications.get('alerts.length'), 'alerts count').to.equal(1);
    });
    (0, _mocha.it)('#clearAll removes everything without deletion', function () {
      let notifications = this.subject();
      let notificationModel = Ember.Object.create({
        message: 'model'
      });

      notificationModel.toJSON = function () {};

      notificationModel.deleteRecord = function () {};

      _sinon.default.spy(notificationModel, 'deleteRecord');

      notificationModel.save = function () {
        return {
          finally(callback) {
            return callback(notificationModel);
          }

        };
      };

      _sinon.default.spy(notificationModel, 'save');

      notifications.handleNotification(notificationModel);
      notifications.handleNotification({
        message: 'pojo'
      });
      notifications.clearAll();
      (0, _chai.expect)(notifications.get('content')).to.be.empty;
      (0, _chai.expect)(notificationModel.deleteRecord.called).to.be.false;
      (0, _chai.expect)(notificationModel.save.called).to.be.false;
    });
    (0, _mocha.it)('#closeAlerts only removes alerts', function () {
      let notifications = this.subject();
      notifications.showNotification('First notification');
      notifications.showAlert('First alert');
      notifications.showAlert('Second alert');
      Ember.run(() => {
        notifications.closeAlerts();
      });
      (0, _chai.expect)(notifications.get('alerts.length')).to.equal(0);
      (0, _chai.expect)(notifications.get('notifications.length')).to.equal(1);
    });
    (0, _mocha.it)('#closeAlerts closes only alerts with specified key', function () {
      let notifications = this.subject();
      notifications.showNotification('First notification');
      notifications.showAlert('First alert', {
        key: 'test.close'
      });
      notifications.showAlert('Second alert', {
        key: 'test.keep'
      });
      notifications.showAlert('Third alert', {
        key: 'test.close'
      });
      Ember.run(() => {
        notifications.closeAlerts('test.close');
      });
      (0, _chai.expect)(notifications.get('alerts.length')).to.equal(1);
      (0, _chai.expect)(notifications.get('alerts.firstObject.message')).to.equal('Second alert');
      (0, _chai.expect)(notifications.get('notifications.length')).to.equal(1);
    });
  });
});
define("ghost-admin/tests/unit/services/resize-detector-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Service: resize-detector', function () {
    (0, _emberMocha.setupTest)('service:resize-detector', {// Specify the other units that are required for this test.
      // needs: ['service:foo']
    }); // Replace this with your real tests.

    (0, _mocha.it)('exists', function () {
      let service = this.subject();
      (0, _chai.expect)(service).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/services/ui-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Service: ui', function () {
    (0, _emberMocha.setupTest)('service:ui', {
      needs: ['service:dropdown', 'service:mediaQueries']
    }); // Replace this with your real tests.

    (0, _mocha.it)('exists', function () {
      let service = this.subject();
      (0, _chai.expect)(service).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/services/unsplash-test", ["pretender", "ember-test-helpers/wait", "mocha", "ghost-admin/tests/helpers/adapter-error", "chai", "ember-mocha"], function (_pretender, _wait, _mocha, _adapterError, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Service: unsplash', function () {
    (0, _emberMocha.setupTest)('service:unsplash', {
      needs: ['service:ajax', 'service:config', 'service:ghostPaths', 'service:settings']
    });
    let server;
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('can load new');
    (0, _mocha.it)('can load next page');
    (0, _mocha.describe)('search', function () {
      (0, _mocha.it)('sends search request');
      (0, _mocha.it)('debounces query updates');
      (0, _mocha.it)('can load next page of search results');
      (0, _mocha.it)('clears photos when starting new search');
      (0, _mocha.it)('loads new when query is cleared');
    });
    (0, _mocha.describe)('columns', function () {
      (0, _mocha.it)('sorts photos into columns based on column height');
      (0, _mocha.it)('can change column count');
    });
    (0, _mocha.describe)('error handling', function () {
      (0, _mocha.it)('handles rate limit exceeded', async function () {
        server.get('https://api.unsplash.com/photos', function () {
          return [403, {
            'x-ratelimit-remaining': '0'
          }, 'Rate Limit Exceeded'];
        });
        let service = this.subject();
        Ember.run(() => {
          service.loadNextPage();
        });
        await (0, _wait.default)();
        (0, _adapterError.errorOverride)();
        (0, _chai.expect)(service.get('error')).to.have.string('Unsplash API rate limit reached');
        (0, _adapterError.errorReset)();
      });
      (0, _mocha.it)('handles json errors', async function () {
        server.get('https://api.unsplash.com/photos', function () {
          return [500, {
            'Content-Type': 'application/json'
          }, JSON.stringify({
            errors: ['Unsplash API Error']
          })];
        });
        let service = this.subject();
        Ember.run(() => {
          service.loadNextPage();
        });
        await (0, _wait.default)();
        (0, _adapterError.errorOverride)();
        (0, _chai.expect)(service.get('error')).to.equal('Unsplash API Error');
        (0, _adapterError.errorReset)();
      });
      (0, _mocha.it)('handles text errors', async function () {
        server.get('https://api.unsplash.com/photos', function () {
          return [500, {
            'Content-Type': 'text/xml'
          }, 'Unsplash text error'];
        });
        let service = this.subject();
        Ember.run(() => {
          service.loadNextPage();
        });
        await (0, _wait.default)();
        (0, _adapterError.errorOverride)();
        (0, _chai.expect)(service.get('error')).to.equal('Unsplash text error');
        (0, _adapterError.errorReset)();
      });
    });
    (0, _mocha.describe)('isLoading', function () {
      (0, _mocha.it)('is false by default');
      (0, _mocha.it)('is true when loading new');
      (0, _mocha.it)('is true when loading next page');
      (0, _mocha.it)('is true when searching');
      (0, _mocha.it)('returns to false when finished');
    });
  });
});
define("ghost-admin/tests/unit/services/upgrade-status-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Service: upgrade-status', function () {
    (0, _emberMocha.setupTest)('service:upgrade-status', {
      // Specify the other units that are required for this test.
      // needs: ['service:foo']
      needs: ['service:notifications']
    }); // Replace this with your real tests.

    (0, _mocha.it)('exists', function () {
      let service = this.subject();
      (0, _chai.expect)(service).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/transforms/facebook-url-user-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Transform: facebook-url-user', function () {
    (0, _emberMocha.setupTest)('transform:facebook-url-user', {});
    (0, _mocha.it)('deserializes facebook url', function () {
      let transform = this.subject();
      let serialized = 'testuser';
      let result = transform.deserialize(serialized);
      (0, _chai.expect)(result).to.equal('https://www.facebook.com/testuser');
    });
    (0, _mocha.it)('serializes url to facebook username', function () {
      let transform = this.subject();
      let deserialized = 'https://www.facebook.com/testuser';
      let result = transform.serialize(deserialized);
      (0, _chai.expect)(result).to.equal('testuser');
    });
  });
});
define("ghost-admin/tests/unit/transforms/json-string-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Transform: json-string', function () {
    (0, _emberMocha.setupTest)('transform:json-string', {});
    (0, _mocha.it)('serialises an Object to a JSON String', function () {
      let transform = this.subject();
      let obj = {
        one: 'one',
        two: 'two'
      };
      (0, _chai.expect)(transform.serialize(obj)).to.equal(JSON.stringify(obj));
    });
    (0, _mocha.it)('deserialises a JSON String to an Object', function () {
      let transform = this.subject();
      let obj = {
        one: 'one',
        two: 'two'
      };
      (0, _chai.expect)(transform.deserialize(JSON.stringify(obj))).to.deep.equal(obj);
    });
    (0, _mocha.it)('handles deserializing a blank string', function () {
      let transform = this.subject();
      (0, _chai.expect)(transform.deserialize('')).to.equal(null);
    });
  });
});
define("ghost-admin/tests/unit/transforms/navigation-settings-test", ["ghost-admin/models/navigation-item", "mocha", "chai", "ember-mocha"], function (_navigationItem, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Transform: navigation-settings', function () {
    (0, _emberMocha.setupTest)('transform:navigation-settings', {});
    (0, _mocha.it)('deserializes navigation json', function () {
      let transform = this.subject();
      let serialized = '[{"label":"One","url":"/one"},{"label":"Two","url":"/two"}]';
      let result = transform.deserialize(serialized);
      (0, _chai.expect)(result.length).to.equal(2);
      (0, _chai.expect)(result[0]).to.be.instanceof(_navigationItem.default);
      (0, _chai.expect)(result[0].get('label')).to.equal('One');
      (0, _chai.expect)(result[0].get('url')).to.equal('/one');
      (0, _chai.expect)(result[1]).to.be.instanceof(_navigationItem.default);
      (0, _chai.expect)(result[1].get('label')).to.equal('Two');
      (0, _chai.expect)(result[1].get('url')).to.equal('/two');
    });
    (0, _mocha.it)('serializes array of NavigationItems', function () {
      let transform = this.subject();
      let deserialized = Ember.A([_navigationItem.default.create({
        label: 'One',
        url: '/one'
      }), _navigationItem.default.create({
        label: 'Two',
        url: '/two'
      })]);
      let result = transform.serialize(deserialized);
      (0, _chai.expect)(result).to.equal('[{"label":"One","url":"/one"},{"label":"Two","url":"/two"}]');
    });
  });
});
define("ghost-admin/tests/unit/transforms/slack-settings-test", ["ghost-admin/models/slack-integration", "mocha", "chai", "ember-mocha"], function (_slackIntegration, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Transform: slack-settings', function () {
    (0, _emberMocha.setupTest)('transform:slack-settings', {});
    (0, _mocha.it)('deserializes settings json', function () {
      let transform = this.subject();
      let serialized = '[{"url":"http://myblog.com/blogpost1","username":"SlackBot"}]';
      let result = transform.deserialize(serialized);
      (0, _chai.expect)(result.length).to.equal(1);
      (0, _chai.expect)(result[0]).to.be.instanceof(_slackIntegration.default);
      (0, _chai.expect)(result[0].get('url')).to.equal('http://myblog.com/blogpost1');
      (0, _chai.expect)(result[0].get('username')).to.equal('SlackBot');
    });
    (0, _mocha.it)('deserializes empty array', function () {
      let transform = this.subject();
      let serialized = '[]';
      let result = transform.deserialize(serialized);
      (0, _chai.expect)(result.length).to.equal(1);
      (0, _chai.expect)(result[0]).to.be.instanceof(_slackIntegration.default);
      (0, _chai.expect)(result[0].get('url')).to.equal('');
      (0, _chai.expect)(result[0].get('username')).to.equal('');
    });
    (0, _mocha.it)('serializes array of Slack settings', function () {
      let transform = this.subject();
      let deserialized = Ember.A([_slackIntegration.default.create({
        url: 'http://myblog.com/blogpost1',
        username: 'SlackBot'
      })]);
      let result = transform.serialize(deserialized);
      (0, _chai.expect)(result).to.equal('[{"url":"http://myblog.com/blogpost1","username":"SlackBot"}]');
    });
    (0, _mocha.it)('serializes empty SlackIntegration objects', function () {
      let transform = this.subject();
      let deserialized = Ember.A([_slackIntegration.default.create({
        url: ''
      })]);
      let result = transform.serialize(deserialized);
      (0, _chai.expect)(result).to.equal('[]');
    });
  });
});
define("ghost-admin/tests/unit/transforms/twitter-url-user-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Transform: twitter-url-user', function () {
    (0, _emberMocha.setupTest)('transform:twitter-url-user', {});
    (0, _mocha.it)('deserializes twitter url', function () {
      let transform = this.subject();
      let serialized = '@testuser';
      let result = transform.deserialize(serialized);
      (0, _chai.expect)(result).to.equal('https://twitter.com/testuser');
    });
    (0, _mocha.it)('serializes url to twitter username', function () {
      let transform = this.subject();
      let deserialized = 'https://twitter.com/testuser';
      let result = transform.serialize(deserialized);
      (0, _chai.expect)(result).to.equal('@testuser');
    });
  });
});
define("ghost-admin/tests/unit/transforms/unsplash-settings-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Transform: unsplash-settings', function () {
    (0, _emberMocha.setupTest)('transform:unsplash-settings', {// Specify the other units that are required for this test.
      // needs: ['transform:foo']
    });
    (0, _mocha.it)('deserializes to default value when null', function () {
      let serialized = null;
      let result = this.subject().deserialize(serialized);
      (0, _chai.expect)(result.isActive).to.be.true;
    });
    (0, _mocha.it)('deserializes to default value when blank string', function () {
      let serialized = '';
      let result = this.subject().deserialize(serialized);
      (0, _chai.expect)(result.isActive).to.be.true;
    });
    (0, _mocha.it)('deserializes to default value when invalid JSON', function () {
      let serialized = 'not JSON';
      let result = this.subject().deserialize(serialized);
      (0, _chai.expect)(result.isActive).to.be.true;
    });
    (0, _mocha.it)('deserializes valid JSON object', function () {
      let serialized = '{"isActive":false}';
      let result = this.subject().deserialize(serialized);
      (0, _chai.expect)(result.isActive).to.be.false;
    });
    (0, _mocha.it)('serializes to JSON string', function () {
      let deserialized = {
        isActive: false
      };
      let result = this.subject().serialize(deserialized);
      (0, _chai.expect)(result).to.equal('{"isActive":false}');
    });
    (0, _mocha.it)('serializes to default value when blank', function () {
      let deserialized = '';
      let result = this.subject().serialize(deserialized);
      (0, _chai.expect)(result).to.equal('{"isActive":true}');
    });
  });
});
define("ghost-admin/tests/unit/utils/ghost-paths-test", ["ghost-admin/utils/ghost-paths", "mocha", "chai"], function (_ghostPaths, _mocha, _chai) {
  "use strict";

  (0, _mocha.describe)('Unit: Util: ghost-paths', function () {
    (0, _mocha.describe)('join', function () {
      let join = (0, _ghostPaths.default)().url.join;
      (0, _mocha.it)('should join two or more paths, normalizing slashes', function () {
        let path;
        path = join('/one/', '/two/');
        (0, _chai.expect)(path).to.equal('/one/two/');
        path = join('/one', '/two/');
        (0, _chai.expect)(path).to.equal('/one/two/');
        path = join('/one/', 'two/');
        (0, _chai.expect)(path).to.equal('/one/two/');
        path = join('/one/', 'two/', '/three/');
        (0, _chai.expect)(path).to.equal('/one/two/three/');
        path = join('/one/', 'two', 'three/');
        (0, _chai.expect)(path).to.equal('/one/two/three/');
      });
      (0, _mocha.it)('should not change the slash at the beginning', function () {
        let path;
        path = join('one/');
        (0, _chai.expect)(path).to.equal('one/');
        path = join('one/', 'two');
        (0, _chai.expect)(path).to.equal('one/two/');
        path = join('/one/', 'two');
        (0, _chai.expect)(path).to.equal('/one/two/');
        path = join('one/', 'two', 'three');
        (0, _chai.expect)(path).to.equal('one/two/three/');
        path = join('/one/', 'two', 'three');
        (0, _chai.expect)(path).to.equal('/one/two/three/');
      });
      (0, _mocha.it)('should always return a slash at the end', function () {
        let path;
        path = join();
        (0, _chai.expect)(path).to.equal('/');
        path = join('');
        (0, _chai.expect)(path).to.equal('/');
        path = join('one');
        (0, _chai.expect)(path).to.equal('one/');
        path = join('one/');
        (0, _chai.expect)(path).to.equal('one/');
        path = join('one', 'two');
        (0, _chai.expect)(path).to.equal('one/two/');
        path = join('one', 'two/');
        (0, _chai.expect)(path).to.equal('one/two/');
      });
    });
  });
});
define("ghost-admin/tests/unit/validators/nav-item-test", ["ghost-admin/models/navigation-item", "ghost-admin/validators/nav-item", "mocha", "chai"], function (_navigationItem, _navItem, _mocha, _chai) {
  "use strict";

  const testInvalidUrl = function testInvalidUrl(url) {
    let navItem = _navigationItem.default.create({
      url
    });

    _navItem.default.check(navItem, 'url');

    (0, _chai.expect)(_navItem.default.get('passed'), "\"".concat(url, "\" passed")).to.be.false;
    (0, _chai.expect)(navItem.get('errors').errorsFor('url').toArray()).to.deep.equal([{
      attribute: 'url',
      message: 'You must specify a valid URL or relative path'
    }]);
    (0, _chai.expect)(navItem.get('hasValidated')).to.include('url');
  };

  const testValidUrl = function testValidUrl(url) {
    let navItem = _navigationItem.default.create({
      url
    });

    _navItem.default.check(navItem, 'url');

    (0, _chai.expect)(_navItem.default.get('passed'), "\"".concat(url, "\" failed")).to.be.true;
    (0, _chai.expect)(navItem.get('hasValidated')).to.include('url');
  };

  (0, _mocha.describe)('Unit: Validator: nav-item', function () {
    (0, _mocha.it)('requires label presence', function () {
      let navItem = _navigationItem.default.create();

      _navItem.default.check(navItem, 'label');

      (0, _chai.expect)(_navItem.default.get('passed')).to.be.false;
      (0, _chai.expect)(navItem.get('errors').errorsFor('label').toArray()).to.deep.equal([{
        attribute: 'label',
        message: 'You must specify a label'
      }]);
      (0, _chai.expect)(navItem.get('hasValidated')).to.include('label');
    });
    (0, _mocha.it)('requires url presence', function () {
      let navItem = _navigationItem.default.create();

      _navItem.default.check(navItem, 'url');

      (0, _chai.expect)(_navItem.default.get('passed')).to.be.false;
      (0, _chai.expect)(navItem.get('errors').errorsFor('url').toArray()).to.deep.equal([{
        attribute: 'url',
        message: 'You must specify a URL or relative path'
      }]);
      (0, _chai.expect)(navItem.get('hasValidated')).to.include('url');
    });
    (0, _mocha.it)('fails on invalid url values', function () {
      let invalidUrls = ['test@example.com', '/has spaces', 'no-leading-slash', 'http://example.com/with spaces'];
      invalidUrls.forEach(function (url) {
        testInvalidUrl(url);
      });
    });
    (0, _mocha.it)('passes on valid url values', function () {
      let validUrls = ['http://localhost:2368', 'http://localhost:2368/some-path', 'https://localhost:2368/some-path', '//localhost:2368/some-path', 'http://localhost:2368/#test', 'http://localhost:2368/?query=test&another=example', 'http://localhost:2368/?query=test&another=example#test', 'tel:01234-567890', 'mailto:test@example.com', 'http://some:user@example.com:1234', '/relative/path'];
      validUrls.forEach(function (url) {
        testValidUrl(url);
      });
    });
    (0, _mocha.it)('validates url and label by default', function () {
      let navItem = _navigationItem.default.create();

      _navItem.default.check(navItem);

      (0, _chai.expect)(navItem.get('errors').errorsFor('label')).to.not.be.empty;
      (0, _chai.expect)(navItem.get('errors').errorsFor('url')).to.not.be.empty;
      (0, _chai.expect)(_navItem.default.get('passed')).to.be.false;
    });
  });
});
define("ghost-admin/tests/unit/validators/post-test", ["ghost-admin/mixins/validation-engine", "mocha", "chai"], function (_validationEngine, _mocha, _chai) {
  "use strict";

  const Post = Ember.Object.extend(_validationEngine.default, {
    validationType: 'post',
    email: null
  });
  (0, _mocha.describe)('Unit: Validator: post', function () {
    (0, _mocha.describe)('canonicalUrl', function () {
      (0, _mocha.it)('can be blank', async function () {
        let post = Post.create({
          canonicalUrl: ''
        });
        let passed = await post.validate({
          property: 'canonicalUrl'
        }).then(() => true);
        (0, _chai.expect)(passed, 'passed').to.be.true;
        (0, _chai.expect)(post.hasValidated).to.include('canonicalUrl');
      });
      (0, _mocha.it)('can be an absolute URL', async function () {
        let post = Post.create({
          canonicalUrl: 'http://example.com'
        });
        let passed = await post.validate({
          property: 'canonicalUrl'
        }).then(() => true);
        (0, _chai.expect)(passed, 'passed').to.be.true;
        (0, _chai.expect)(post.hasValidated).to.include('canonicalUrl');
      });
      (0, _mocha.it)('can be a relative URL', async function () {
        let post = Post.create({
          canonicalUrl: '/my-other-post'
        });
        let passed = await post.validate({
          property: 'canonicalUrl'
        }).then(() => true);
        (0, _chai.expect)(passed, 'passed').to.be.true;
        (0, _chai.expect)(post.hasValidated).to.include('canonicalUrl');
      });
      (0, _mocha.it)('cannot be a random string', async function () {
        let post = Post.create({
          canonicalUrl: 'asdfghjk'
        });
        let passed = await post.validate({
          property: 'canonicalUrl'
        }).then(() => true);
        (0, _chai.expect)(passed, 'passed').to.be.false;
        (0, _chai.expect)(post.hasValidated).to.include('canonicalUrl');
        let error = post.errors.errorsFor('canonicalUrl').get(0);
        (0, _chai.expect)(error.attribute).to.equal('canonicalUrl');
        (0, _chai.expect)(error.message).to.equal('Please enter a valid URL');
      });
      (0, _mocha.it)('cannot be too long', async function () {
        let post = Post.create({
          canonicalUrl: "http://example.com/".concat(new Array(1983).join('x'))
        });
        let passed = await post.validate({
          property: 'canonicalUrl'
        }).then(() => true);
        (0, _chai.expect)(passed, 'passed').to.be.false;
        (0, _chai.expect)(post.hasValidated).to.include('canonicalUrl');
        let error = post.errors.errorsFor('canonicalUrl').get(0);
        (0, _chai.expect)(error.attribute).to.equal('canonicalUrl');
        (0, _chai.expect)(error.message).to.equal('Please enter a valid URL');
      });
    });
  });
});
define("ghost-admin/tests/unit/validators/slack-integration-test", ["ghost-admin/models/slack-integration", "ghost-admin/validators/slack-integration", "mocha", "chai"], function (_slackIntegration, _slackIntegration2, _mocha, _chai) {
  "use strict";

  const testInvalidUrl = function testInvalidUrl(url) {
    let slackObject = _slackIntegration.default.create({
      url
    });

    _slackIntegration2.default.check(slackObject, 'url');

    (0, _chai.expect)(_slackIntegration2.default.get('passed'), "\"".concat(url, "\" passed")).to.be.false;
    (0, _chai.expect)(slackObject.get('errors').errorsFor('url').toArray()).to.deep.equal([{
      attribute: 'url',
      message: 'The URL must be in a format like https://hooks.slack.com/services/<your personal key>'
    }]);
    (0, _chai.expect)(slackObject.get('hasValidated')).to.include('url');
  };

  const testValidUrl = function testValidUrl(url) {
    let slackObject = _slackIntegration.default.create({
      url
    });

    _slackIntegration2.default.check(slackObject, 'url');

    (0, _chai.expect)(_slackIntegration2.default.get('passed'), "\"".concat(url, "\" failed")).to.be.true;
    (0, _chai.expect)(slackObject.get('hasValidated')).to.include('url');
  };

  (0, _mocha.describe)('Unit: Validator: slack-integration', function () {
    (0, _mocha.it)('fails on invalid url values', function () {
      let invalidUrls = ['test@example.com', '/has spaces', 'no-leading-slash', 'http://example.com/with spaces'];
      invalidUrls.forEach(function (url) {
        testInvalidUrl(url);
      });
    });
    (0, _mocha.it)('passes on valid url values', function () {
      let validUrls = ['https://hooks.slack.com/services/;alskdjf', 'https://hooks.slack.com/services/123445678', 'https://hooks.slack.com/services/some_webhook', 'https://discordapp.com/api/webhooks/380692408364433418/mGLHSRyEoUaTvY91Te16WOT8Obn-BrJoiTNoxeUqhb6klKERb9xaZkUBYC5AeduwYCCy/slack'];
      validUrls.forEach(function (url) {
        testValidUrl(url);
      });
    });
    (0, _mocha.it)('validates url by default', function () {
      let slackObject = _slackIntegration.default.create();

      _slackIntegration2.default.check(slackObject);

      (0, _chai.expect)(slackObject.get('errors').errorsFor('url')).to.be.empty;
      (0, _chai.expect)(_slackIntegration2.default.get('passed')).to.be.true;
    });
  });
});
define("ghost-admin/tests/unit/validators/subscriber-test", ["ghost-admin/mixins/validation-engine", "mocha", "chai"], function (_validationEngine, _mocha, _chai) {
  "use strict";

  const Subscriber = Ember.Object.extend(_validationEngine.default, {
    validationType: 'subscriber',
    email: null
  });
  (0, _mocha.describe)('Unit: Validator: subscriber', function () {
    (0, _mocha.it)('validates email by default', function () {
      let subscriber = Subscriber.create({});
      let properties = subscriber.get('validators.subscriber.properties');
      (0, _chai.expect)(properties, 'properties').to.include('email');
    });
    (0, _mocha.it)('passes with a valid email', function () {
      let subscriber = Subscriber.create({
        email: 'test@example.com'
      });
      let passed = false;
      Ember.run(() => {
        subscriber.validate({
          property: 'email'
        }).then(() => {
          passed = true;
        });
      });
      (0, _chai.expect)(passed, 'passed').to.be.true;
      (0, _chai.expect)(subscriber.get('hasValidated'), 'hasValidated').to.include('email');
    });
    (0, _mocha.it)('validates email presence', function () {
      let subscriber = Subscriber.create({});
      let passed = false;
      Ember.run(() => {
        subscriber.validate({
          property: 'email'
        }).then(() => {
          passed = true;
        });
      });
      let emailErrors = subscriber.get('errors').errorsFor('email').get(0);
      (0, _chai.expect)(emailErrors.attribute, 'errors.email.attribute').to.equal('email');
      (0, _chai.expect)(emailErrors.message, 'errors.email.message').to.equal('Please enter an email.');
      (0, _chai.expect)(passed, 'passed').to.be.false;
      (0, _chai.expect)(subscriber.get('hasValidated'), 'hasValidated').to.include('email');
    });
    (0, _mocha.it)('validates email', function () {
      let subscriber = Subscriber.create({
        email: 'foo'
      });
      let passed = false;
      Ember.run(() => {
        subscriber.validate({
          property: 'email'
        }).then(() => {
          passed = true;
        });
      });
      let emailErrors = subscriber.get('errors').errorsFor('email').get(0);
      (0, _chai.expect)(emailErrors.attribute, 'errors.email.attribute').to.equal('email');
      (0, _chai.expect)(emailErrors.message, 'errors.email.message').to.equal('Invalid email.');
      (0, _chai.expect)(passed, 'passed').to.be.false;
      (0, _chai.expect)(subscriber.get('hasValidated'), 'hasValidated').to.include('email');
    });
  });
});
define("ghost-admin/tests/unit/validators/tag-settings-test", ["ghost-admin/mixins/validation-engine", "mocha", "chai"], function (_validationEngine, _mocha, _chai) {
  "use strict";

  const Tag = Ember.Object.extend(_validationEngine.default, {
    validationType: 'tag',
    name: null,
    description: null,
    metaTitle: null,
    metaDescription: null
  }); // TODO: These tests have way too much duplication, consider creating test
  // helpers for validations
  // TODO: Move testing of validation-engine behaviour into validation-engine-test
  // and replace these tests with specific validator tests

  (0, _mocha.describe)('Unit: Validator: tag-settings', function () {
    (0, _mocha.it)('validates all fields by default', function () {
      let tag = Tag.create({});
      let properties = tag.get('validators.tag.properties'); // TODO: This is checking implementation details rather than expected
      // behaviour. Replace once we have consistent behaviour (see below)

      (0, _chai.expect)(properties, 'properties').to.include('name');
      (0, _chai.expect)(properties, 'properties').to.include('slug');
      (0, _chai.expect)(properties, 'properties').to.include('description');
      (0, _chai.expect)(properties, 'properties').to.include('metaTitle');
      (0, _chai.expect)(properties, 'properties').to.include('metaDescription'); // TODO: .validate (and  by extension .save) doesn't currently affect
      // .hasValidated - it would be good to make this consistent.
      // The following tests currently fail:
      //
      // run(() => {
      //     tag.validate();
      // });
      //
      // expect(tag.get('hasValidated'), 'hasValidated').to.include('name');
      // expect(tag.get('hasValidated'), 'hasValidated').to.include('description');
      // expect(tag.get('hasValidated'), 'hasValidated').to.include('metaTitle');
      // expect(tag.get('hasValidated'), 'hasValidated').to.include('metaDescription');
    });
    (0, _mocha.it)('passes with valid name', function () {
      // longest valid name
      let tag = Tag.create({
        name: new Array(192).join('x')
      });
      let passed = false;
      (0, _chai.expect)(tag.get('name').length, 'name length').to.equal(191);
      Ember.run(() => {
        tag.validate({
          property: 'name'
        }).then(() => {
          passed = true;
        });
      });
      (0, _chai.expect)(passed, 'passed').to.be.true;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('name');
    });
    (0, _mocha.it)('validates name presence', function () {
      let tag = Tag.create();
      let passed = false;
      let nameErrors; // TODO: validator is currently a singleton meaning state leaks
      // between all objects that use it. Each object should either
      // get it's own validator instance or validator objects should not
      // contain state. The following currently fails:
      //
      // let validator = tag.get('validators.tag')
      // expect(validator.get('passed'), 'passed').to.be.false;

      Ember.run(() => {
        tag.validate({
          property: 'name'
        }).then(() => {
          passed = true;
        });
      });
      nameErrors = tag.get('errors').errorsFor('name').get(0);
      (0, _chai.expect)(nameErrors.attribute, 'errors.name.attribute').to.equal('name');
      (0, _chai.expect)(nameErrors.message, 'errors.name.message').to.equal('You must specify a name for the tag.');
      (0, _chai.expect)(passed, 'passed').to.be.false;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('name');
    });
    (0, _mocha.it)('validates names starting with a comma', function () {
      let tag = Tag.create({
        name: ',test'
      });
      let passed = false;
      let nameErrors;
      Ember.run(() => {
        tag.validate({
          property: 'name'
        }).then(() => {
          passed = true;
        });
      });
      nameErrors = tag.get('errors').errorsFor('name').get(0);
      (0, _chai.expect)(nameErrors.attribute, 'errors.name.attribute').to.equal('name');
      (0, _chai.expect)(nameErrors.message, 'errors.name.message').to.equal('Tag names can\'t start with commas.');
      (0, _chai.expect)(passed, 'passed').to.be.false;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('name');
    });
    (0, _mocha.it)('validates name length', function () {
      // shortest invalid name
      let tag = Tag.create({
        name: new Array(193).join('x')
      });
      let passed = false;
      let nameErrors;
      (0, _chai.expect)(tag.get('name').length, 'name length').to.equal(192);
      Ember.run(() => {
        tag.validate({
          property: 'name'
        }).then(() => {
          passed = true;
        });
      });
      nameErrors = tag.get('errors').errorsFor('name')[0];
      (0, _chai.expect)(nameErrors.attribute, 'errors.name.attribute').to.equal('name');
      (0, _chai.expect)(nameErrors.message, 'errors.name.message').to.equal('Tag names cannot be longer than 191 characters.');
      (0, _chai.expect)(passed, 'passed').to.be.false;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('name');
    });
    (0, _mocha.it)('passes with valid slug', function () {
      // longest valid slug
      let tag = Tag.create({
        slug: new Array(192).join('x')
      });
      let passed = false;
      (0, _chai.expect)(tag.get('slug').length, 'slug length').to.equal(191);
      Ember.run(() => {
        tag.validate({
          property: 'slug'
        }).then(() => {
          passed = true;
        });
      });
      (0, _chai.expect)(passed, 'passed').to.be.true;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('slug');
    });
    (0, _mocha.it)('validates slug length', function () {
      // shortest invalid slug
      let tag = Tag.create({
        slug: new Array(193).join('x')
      });
      let passed = false;
      let slugErrors;
      (0, _chai.expect)(tag.get('slug').length, 'slug length').to.equal(192);
      Ember.run(() => {
        tag.validate({
          property: 'slug'
        }).then(() => {
          passed = true;
        });
      });
      slugErrors = tag.get('errors').errorsFor('slug')[0];
      (0, _chai.expect)(slugErrors.attribute, 'errors.slug.attribute').to.equal('slug');
      (0, _chai.expect)(slugErrors.message, 'errors.slug.message').to.equal('URL cannot be longer than 191 characters.');
      (0, _chai.expect)(passed, 'passed').to.be.false;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('slug');
    });
    (0, _mocha.it)('passes with a valid description', function () {
      // longest valid description
      let tag = Tag.create({
        description: new Array(501).join('x')
      });
      let passed = false;
      (0, _chai.expect)(tag.get('description').length, 'description length').to.equal(500);
      Ember.run(() => {
        tag.validate({
          property: 'description'
        }).then(() => {
          passed = true;
        });
      });
      (0, _chai.expect)(passed, 'passed').to.be.true;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('description');
    });
    (0, _mocha.it)('validates description length', function () {
      // shortest invalid description
      let tag = Tag.create({
        description: new Array(502).join('x')
      });
      let passed = false;
      let errors;
      (0, _chai.expect)(tag.get('description').length, 'description length').to.equal(501);
      Ember.run(() => {
        tag.validate({
          property: 'description'
        }).then(() => {
          passed = true;
        });
      });
      errors = tag.get('errors').errorsFor('description')[0];
      (0, _chai.expect)(errors.attribute, 'errors.description.attribute').to.equal('description');
      (0, _chai.expect)(errors.message, 'errors.description.message').to.equal('Description cannot be longer than 500 characters.'); // TODO: tag.errors appears to be a singleton and previous errors are
      // not cleared despite creating a new tag object
      //
      // console.log(JSON.stringify(tag.get('errors')));
      // expect(tag.get('errors.length')).to.equal(1);

      (0, _chai.expect)(passed, 'passed').to.be.false;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('description');
    }); // TODO: we have both metaTitle and metaTitle property names on the
    // model/validator respectively - this should be standardised

    (0, _mocha.it)('passes with a valid metaTitle', function () {
      // longest valid metaTitle
      let tag = Tag.create({
        metaTitle: new Array(301).join('x')
      });
      let passed = false;
      (0, _chai.expect)(tag.get('metaTitle').length, 'metaTitle length').to.equal(300);
      Ember.run(() => {
        tag.validate({
          property: 'metaTitle'
        }).then(() => {
          passed = true;
        });
      });
      (0, _chai.expect)(passed, 'passed').to.be.true;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('metaTitle');
    });
    (0, _mocha.it)('validates metaTitle length', function () {
      // shortest invalid metaTitle
      let tag = Tag.create({
        metaTitle: new Array(302).join('x')
      });
      let passed = false;
      let errors;
      (0, _chai.expect)(tag.get('metaTitle').length, 'metaTitle length').to.equal(301);
      Ember.run(() => {
        tag.validate({
          property: 'metaTitle'
        }).then(() => {
          passed = true;
        });
      });
      errors = tag.get('errors').errorsFor('metaTitle')[0];
      (0, _chai.expect)(errors.attribute, 'errors.metaTitle.attribute').to.equal('metaTitle');
      (0, _chai.expect)(errors.message, 'errors.metaTitle.message').to.equal('Meta Title cannot be longer than 300 characters.');
      (0, _chai.expect)(passed, 'passed').to.be.false;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('metaTitle');
    }); // TODO: we have both metaDescription and metaDescription property names on
    // the model/validator respectively - this should be standardised

    (0, _mocha.it)('passes with a valid metaDescription', function () {
      // longest valid description
      let tag = Tag.create({
        metaDescription: new Array(501).join('x')
      });
      let passed = false;
      (0, _chai.expect)(tag.get('metaDescription').length, 'metaDescription length').to.equal(500);
      Ember.run(() => {
        tag.validate({
          property: 'metaDescription'
        }).then(() => {
          passed = true;
        });
      });
      (0, _chai.expect)(passed, 'passed').to.be.true;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('metaDescription');
    });
    (0, _mocha.it)('validates metaDescription length', function () {
      // shortest invalid metaDescription
      let tag = Tag.create({
        metaDescription: new Array(502).join('x')
      });
      let passed = false;
      let errors;
      (0, _chai.expect)(tag.get('metaDescription').length, 'metaDescription length').to.equal(501);
      Ember.run(() => {
        tag.validate({
          property: 'metaDescription'
        }).then(() => {
          passed = true;
        });
      });
      errors = tag.get('errors').errorsFor('metaDescription')[0];
      (0, _chai.expect)(errors.attribute, 'errors.metaDescription.attribute').to.equal('metaDescription');
      (0, _chai.expect)(errors.message, 'errors.metaDescription.message').to.equal('Meta Description cannot be longer than 500 characters.');
      (0, _chai.expect)(passed, 'passed').to.be.false;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('metaDescription');
    });
  });
});
define('ghost-admin/config/environment', [], function() {
  var prefix = 'ghost-admin';
try {
  var metaName = prefix + '/config/environment';
  var rawConfig = document.querySelector('meta[name="' + metaName + '"]').getAttribute('content');
  var config = JSON.parse(decodeURIComponent(rawConfig));

  var exports = { 'default': config };

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;
}
catch(err) {
  throw new Error('Could not read config from meta tag with name "' + metaName + '".');
}

});

require('ghost-admin/tests/test-helper');
EmberENV.TESTS_FILE_LOADED = true;
//# sourceMappingURL=tests.map
