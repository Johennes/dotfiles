;; Add MELPA repos
(require 'package)
(add-to-list 'package-archives
	     '("melpa" . "http://melpa.milkbox.net/packages/")
	     t)

;; Added by Package.el.  This must come before configurations of
;; installed packages.  Don't delete this line.  If you don't want it,
;; just comment it out by adding a semicolon to the start of the line.
;; You may delete these explanatory comments.
(package-initialize)

;; Load color theme
;;(add-to-list 'custom-theme-load-path "~/.emacs.d/themes/") 
;;(load-theme 'synthwave t)
(load-theme 'zeno t)



;;(require 'ergoemacs-mode)

;;(setq ergoemacs-theme nil) ;; Uses Standard Ergoemacs keyboard theme
;;(setq ergoemacs-keyboard-layout "us") ;; Assumes QWERTY keyboard layout
;;(ergoemacs-mode 1)


(require 'neotree)

;; Org mode configuration
(setq org-directory "~/Notes")
(setq org-default-notes-file (concat org-directory "/inbox.org"))
(define-key global-map "\C-cc" 'org-capture)

(setq org-todo-keywords '((sequence "TODO(t)" "WAITING(w)" "|" "DONE(d)")))

(setq org-capture-templates
      '(("t" "Todo [inbox]" entry
	 (file org-default-notes-file)
	 "* TODO %i%?")))

(setq org-refile-targets
      '(("projects.org" :maxlevel . 3)
	("someday.org" :level . 1)))
(setq org-refile-allow-creating-parent-nodes (quote confirm))
(setq org-refile-use-outline-path 'file)

(setq org-agenda-files '("projects.org"))
(setq org-hierarchical-todo-statistics nil)

(global-set-key "\C-cl" 'org-store-link)
(global-set-key "\C-ca" 'org-agenda)
(global-set-key "\C-cb" 'org-switchb)

;; Open file on start-up
(find-file "/Users/jmarbach/Notes/projects.org")

