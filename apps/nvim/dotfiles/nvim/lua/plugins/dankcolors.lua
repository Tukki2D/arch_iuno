return {
	{
		"RRethy/base16-nvim",
		priority = 1000,
		config = function()
			require('base16-colorscheme').setup({
				base00 = '#0d0d14',
				base01 = '#0d0d14',
				base02 = '#827575',
				base03 = '#827575',
				base04 = '#b4a5a5',
				base05 = '#f9f0f0',
				base06 = '#f9f0f0',
				base07 = '#f9f0f0',
				base08 = '#e86c6c',
				base09 = '#e86c6c',
				base0A = '#bd4b4b',
				base0B = '#7ece67',
				base0C = '#f0a3a3',
				base0D = '#bd4b4b',
				base0E = '#df7070',
				base0F = '#df7070',
			})

			vim.api.nvim_set_hl(0, 'Visual', {
				bg = '#827575',
				fg = '#f9f0f0',
				bold = true
			})
			vim.api.nvim_set_hl(0, 'Statusline', {
				bg = '#bd4b4b',
				fg = '#0d0d14',
			})
			vim.api.nvim_set_hl(0, 'LineNr', { fg = '#827575' })
			vim.api.nvim_set_hl(0, 'CursorLineNr', { fg = '#f0a3a3', bold = true })

			vim.api.nvim_set_hl(0, 'Statement', {
				fg = '#df7070',
				bold = true
			})
			vim.api.nvim_set_hl(0, 'Keyword', { link = 'Statement' })
			vim.api.nvim_set_hl(0, 'Repeat', { link = 'Statement' })
			vim.api.nvim_set_hl(0, 'Conditional', { link = 'Statement' })

			vim.api.nvim_set_hl(0, 'Function', {
				fg = '#bd4b4b',
				bold = true
			})
			vim.api.nvim_set_hl(0, 'Macro', {
				fg = '#bd4b4b',
				italic = true
			})
			vim.api.nvim_set_hl(0, '@function.macro', { link = 'Macro' })

			vim.api.nvim_set_hl(0, 'Type', {
				fg = '#f0a3a3',
				bold = true,
				italic = true
			})
			vim.api.nvim_set_hl(0, 'Structure', { link = 'Type' })

			vim.api.nvim_set_hl(0, 'String', {
				fg = '#7ece67',
				italic = true
			})

			vim.api.nvim_set_hl(0, 'Operator', { fg = '#b4a5a5' })
			vim.api.nvim_set_hl(0, 'Delimiter', { fg = '#b4a5a5' })
			vim.api.nvim_set_hl(0, '@punctuation.bracket', { link = 'Delimiter' })
			vim.api.nvim_set_hl(0, '@punctuation.delimiter', { link = 'Delimiter' })

			vim.api.nvim_set_hl(0, 'Comment', {
				fg = '#827575',
				italic = true
			})

			local current_file_path = vim.fn.stdpath("config") .. "/lua/plugins/dankcolors.lua"
			if not _G._matugen_theme_watcher then
				local uv = vim.uv or vim.loop
				_G._matugen_theme_watcher = uv.new_fs_event()
				_G._matugen_theme_watcher:start(current_file_path, {}, vim.schedule_wrap(function()
					local new_spec = dofile(current_file_path)
					if new_spec and new_spec[1] and new_spec[1].config then
						new_spec[1].config()
						print("Theme reload")
					end
				end))
			end
		end
	}
}
