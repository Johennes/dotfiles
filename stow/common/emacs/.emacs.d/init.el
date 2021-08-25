;; Package sources

(require 'package)

(add-to-list 'package-archives '("elpa" . "https://elpa.gnu.org/packages/"))
(add-to-list 'package-archives '("melpa" . "http://melpa.org/packages/"))
(setq package-selected-packages '(apropospriate-theme))

(unless package-archive-contents
  (package-refresh-contents))

(package-initialize)


;; Use-package

(unless (package-installed-p 'use-package)
  (package-install 'use-package))

(require 'use-package)
(setq use-package-always-ensure t)


;; Completion

(use-package vertico
  :init
  (vertico-mode))

(use-package orderless
  :init
  (setq completion-styles '(orderless)
        completion-category-defaults nil
        completion-category-overrides '((file (styles partial-completion)))))

(use-package savehist
  :init
  (savehist-mode))


;; Theming & appearance

(use-package apropospriate-theme
  :init
  (load-theme 'apropospriate-dark t))

(set-face-attribute 'default nil :height 150)


;; General

(setq my--notes-home (file-truename "~/Notes"))

(setq auto-save-default t)
(setq auto-save-visited-file-name t)
(setq-default indent-tabs-mode nil)

(add-hook 'text-mode-hook 'turn-on-visual-line-mode)


;; Org

(setq org-agenda-custom-commands
      '(("u" "Reading list" todo "UNREAD"
         ((org-agenda-prefix-format " %i ")))))
(setq org-agenda-files (directory-files-recursively my--notes-home "\.org$"))
(setq org-auto-align-tags t)
(setq org-complete-tags-always-offer-all-agenda-tags t)
(setq org-cycle-separator-lines 1) ;; Preserve single blank line after folding subtree
(setq org-directory my--notes-home)
(setq org-log-done t)
(setq org-startup-with-inline-images t)
(setq org-tags-column 0)
(setq org-todo-keywords '((sequence "TODO" "DOING" "WAITING" "|" "DONE")))

(remove-hook 'org-cycle-hook 'org-cycle-hide-drawers) ;; Expand drawers when cycling


;; Org > Roam

(use-package org-roam
  :custom
  (setq org-roam-v2-ack t)
  (org-roam-directory my--notes-home)
  :bind (("C-c n l" . org-roam-buffer-toggle)
         ("C-c n f" . org-roam-node-find)
         ("C-c n g" . org-roam-graph)
         ("C-c n i" . org-roam-node-insert)
         ("C-c n c" . org-roam-capture))
  :config
  (org-roam-db-autosync-mode))


;; Org > Roam > Capture templates

(defun my--org-store-inactive-timestamp ()
  "Create an inactive timestamp and store it into the global my--org-stored-timestamp variable"
  (setq my--org-stored-timestamp (org-time-stamp-inactive)))

(defun my--org-stored-timestamp-to-slug ()
  "Create a slug from the last stored timestamp in my--org-stored-timestamp"
  (replace-regexp-in-string "[- ]" "_" (downcase (substring my--org-stored-timestamp 1 -1))))

(setq org-roam-capture-templates
      '(("d" "default" plain "%?"
         :if-new (file+head "${slug}.org"
                            "#+TITLE: ${title}\n")
         :unnarrowed t)
        ("c" "correspondence" plain "* Correspondents\n\n  - %?\n\n* Summary\n\n  - \n\n* Action items\n\n** \n"
         :if-new (file+head "correspondence/%(progn (my--org-store-inactive-timestamp) (my--org-stored-timestamp-to-slug))_${slug}.org"
                            "#+TITLE: Correspondence / %(format \"%s\" my--org-stored-timestamp) / ${title}\n\n")
         :unnarrowed t)
        ("m" "meeting" plain "* Attendees\n\n  - %?\n\n* Minutes\n\n  - \n\n* Action items\n\n** \n"
         :if-new (file+head "meetings/%(progn (my--org-store-inactive-timestamp) (my--org-stored-timestamp-to-slug))_${slug}.org"
                            "#+TITLE: Meetings / %(format \"%s\" my--org-stored-timestamp) / ${title}\n\n")
         :unnarrowed t)
        ("P" "person" plain "[[./${slug}.jpeg]]\n\n* Personal info\n  :PROPERTIES:\n%?  :Email:\n  :LinkedIn:\n  :Phone:\n  :END:\n\n* General\n\n"
         :if-new (file+head "people/${slug}.org"
                            "#+TITLE: ${title}\n#+FILETAGS: :people:\n\n")
         :unnarrowed t)
        ("r" "reading" plain "* UNREAD [[%^{URL}][${title}]]\n  :PROPERTIES:\n%?  :Author:\n  :Company:\n  :Date:\n  :Type:\n  :END:\n\n* Notes\n\n  - \n"
         :if-new (file+head "reading/${slug}.org"
                            "#+TITLE: Reading / ${title}\n#+FILETAGS: :reading:\n#+TODO: UNREAD READING | READ\n\n")
         :unnarrowed t)
        ("R" "reference" plain "%?"
         :if-new (file+head "reference/${slug}.org"
                            "#+TITLE: ${title}\n#+FILETAGS: :reference:\n\n")
         :unnarrowed t)))


;; Keybindings

(global-set-key (kbd "<escape>") 'keyboard-escape-quit)

(global-set-key (kbd "C-c a") 'org-agenda)
(global-set-key (kbd "C-c l") 'org-store-link)

;;(global-set-key (kbd "C-c n c") 'org-roam-capture)
;;(global-set-key (kbd "C-c n f") 'org-roam-node-find)
;;(global-set-key (kbd "C-c n i") 'org-roam-node-insert)
;;(global-set-key (kbd "C-c n l") 'org-roam-buffer-toggle)


;; Initial frame

(setq default-frame-alist '((width . 120) (height . 35)))
(setq initial-buffer-choice "~/Notes/inbox.org")











;; TODO see if any of the stuff below is still needed

;; Require needed!!
;;(require 'org-id)
;;(setq org-id-link-to-org-use-id 'create-if-interactive-and-no-custom-id)

;;(with-eval-after-load 'org
;;      ;; Org directory & capture file
;;      (setq org-default-notes-file (concat org-directory "/_inbox.org"))
;;      ;; Refiling
;;      (setq org-refile-targets
;;        '(("_projects.org" :maxlevel . 3)
;;          ("_someday.org" :level . 1)))
;;      (setq org-refile-allow-creating-parent-nodes (quote confirm))
;;      (setq org-refile-use-outline-path 'file)
;;      )
;;(dolist
;;        (face '(
;;          org-document-title
;;          org-level-1
;;          org-level-2
;;          org-level-3
;;          org-level-4
;;          org-level-5))
;;        (set-face-attribute face nil :height 1.0))

