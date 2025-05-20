import React, { useState, useMemo } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme, IconButton, useMediaQuery } from '@mui/material';
import { ConfluenceEditor } from './components/Editor';
import { OptionsPanel } from './components/OptionsPanel';
import { ConversionOptions, defaultOptions } from './utils/converter';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

function App() {
  const [options, setOptions] = useState<ConversionOptions>(defaultOptions);
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState<'light' | 'dark'>(prefersDarkMode ? 'dark' : 'light');

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                // Light mode customizations
                background: {
                  default: '#f5f5f5',
                  paper: '#ffffff',
                },
              }
            : {
                // Dark mode customizations
                background: {
                  default: '#121212',
                  paper: '#1e1e1e',
                },
              }),
        },
      }),
    [mode],
  );

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <Box sx={{ width: 300, p: 2, overflowY: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <IconButton onClick={toggleColorMode} color="inherit">
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Box>
          <OptionsPanel options={options} onOptionsChange={setOptions} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <ConfluenceEditor options={options} onOptionsChange={setOptions} />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
