import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Box, Paper, Typography, Button, ToggleButton, ToggleButtonGroup, useTheme } from '@mui/material';
import { EnhancedConfluenceConverter } from '../utils/ConfluenceConverter';
import { ConversionOptions } from '../utils/types';
import { marked } from 'marked';

interface EditorProps {
  options: ConversionOptions;
  onOptionsChange: (options: ConversionOptions) => void;
}

export const ConfluenceEditor: React.FC<EditorProps> = ({ options, onOptionsChange }) => {
  const theme = useTheme();
  const [htmlInput, setHtmlInput] = useState<string>('');
  const [markdownOutput, setMarkdownOutput] = useState<string>('');
  const [renderedHtml, setRenderedHtml] = useState<string>('');
  const [converter, setConverter] = useState(() => new EnhancedConfluenceConverter(options));
  const [inputView, setInputView] = useState<'code' | 'preview'>('code');
  const [outputView, setOutputView] = useState<'code' | 'preview'>('code');
  const [error, setError] = useState<string | null>(null);
  const inputEditorRef = useRef<any>(null);
  const outputEditorRef = useRef<any>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateEditorLayout = useCallback(() => {
    if (inputView === 'code' && inputEditorRef.current) {
      inputEditorRef.current.layout();
    }
    if (outputView === 'code' && outputEditorRef.current) {
      outputEditorRef.current.layout();
    }
  }, [inputView, outputView]);

  useEffect(() => {
    let lastWidth = 0;
    let lastHeight = 0;
    
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      
      const { width, height } = entry.contentRect;
      
      // Only trigger if actual dimensions changed
      if (width !== lastWidth || height !== lastHeight) {
        lastWidth = width;
        lastHeight = height;
        
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        resizeTimeoutRef.current = setTimeout(updateEditorLayout, 100);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [updateEditorLayout]);

  useEffect(() => {
    // Create a new converter instance when options change
    const newConverter = new EnhancedConfluenceConverter(options);
    setConverter(newConverter);
  }, [options]); // Only depend on options

  useEffect(() => {
    // Re-run conversion when converter or htmlInput changes
    if (htmlInput) {
      try {
        const result = converter.convert(htmlInput);
        setMarkdownOutput(result);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred during conversion';
        setError(errorMessage);
        console.error('Conversion error:', err);
        setMarkdownOutput('');
      }
    } else {
      setMarkdownOutput('');
      setError(null);
    }
  }, [htmlInput, converter]); // Depend on htmlInput and converter

  useEffect(() => {
    const renderMarkdown = async () => {
      try {
        const html = await marked.parse(markdownOutput, {
          gfm: true,
          breaks: true
        });
        setRenderedHtml(html as string);
      } catch (err) {
        console.error('Markdown rendering error:', err);
        setRenderedHtml('');
      }
    };
    renderMarkdown();
  }, [markdownOutput]);

  const handleInputEditorDidMount = (editor: any) => {
    inputEditorRef.current = editor;
    updateEditorLayout();
  };

  const handleOutputEditorDidMount = (editor: any) => {
    outputEditorRef.current = editor;
    updateEditorLayout();
  };

  const handleHtmlChange = (value: string | undefined) => {
    if (value !== undefined) {
      setHtmlInput(value);
    } else {
      setHtmlInput('');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setHtmlInput(content);
        // Force layout update after content change
        setTimeout(updateEditorLayout, 0);
      };
      reader.readAsText(file);
    }
  };

  const handleViewChange = (view: 'code' | 'preview' | null, isInput: boolean) => {
    if (view === null) return; // Prevent deselecting
    if (isInput) {
      setInputView(view);
    } else {
      setOutputView(view);
    }
  };

  const renderInputContent = () => {
    if (inputView === 'code') {
      return (
        <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
          <Editor
            height="100%"
            defaultLanguage="html"
            value={htmlInput}
            onChange={handleHtmlChange}
            onMount={handleInputEditorDidMount}
            theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'light'}
            options={{
              minimap: { enabled: false },
              wordWrap: 'on',
              lineNumbers: 'on',
              folding: true,
              fontSize: 14,
              scrollBeyondLastLine: false,
              automaticLayout: false
            }}
          />
        </Box>
      );
    }
    return (
      <Box sx={{ 
        height: '100%',
        width: '100%',
        overflow: 'auto',
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        p: 2,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}>
        <div style={{ 
          width: '100%',
          height: '100%',
          overflow: 'auto',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          overflowX: 'hidden'
        }} dangerouslySetInnerHTML={{ __html: htmlInput }} />
      </Box>
    );
  };

  const renderOutputContent = () => {
    if (outputView === 'code') {
      return (
        <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
          <Editor
            height="100%"
            defaultLanguage="markdown"
            value={markdownOutput}
            onMount={handleOutputEditorDidMount}
            theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'light'}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              wordWrap: 'on',
              lineNumbers: 'on',
              folding: true,
              fontSize: 14,
              scrollBeyondLastLine: false,
              automaticLayout: false
            }}
          />
        </Box>
      );
    }
    return (
      <Box sx={{ 
        height: '100%',
        width: '100%',
        overflow: 'auto',
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        p: 2,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}>
        <div style={{ 
          width: '100%',
          height: '100%',
          overflow: 'auto',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          overflowX: 'hidden'
        }} dangerouslySetInnerHTML={{ __html: renderedHtml }} />
      </Box>
    );
  };

  return (
    <Box ref={containerRef} sx={{ display: 'flex', height: '100%', p: 2, gap: 2 }}>
      <Paper sx={{ 
        flex: 1, 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        overflow: 'hidden',
        minWidth: 0 // This prevents flex items from growing beyond their container
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            HTML Input
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <ToggleButtonGroup
              value={inputView}
              exclusive
              onChange={(_, value) => value && handleViewChange(value, true)}
              size="small"
            >
              <ToggleButton value="code">Code</ToggleButton>
              <ToggleButton value="preview">Preview</ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              component="label"
              size="small"
            >
              Upload HTML
              <input
                type="file"
                hidden
                accept=".html"
                onChange={handleFileUpload}
              />
            </Button>
          </Box>
        </Box>
        <Box sx={{ 
          flex: 1, 
          minHeight: 0, 
          overflow: 'hidden',
          position: 'relative'
        }}>
          {renderInputContent()}
        </Box>
      </Paper>
      <Paper sx={{ 
        flex: 1, 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        overflow: 'hidden',
        minWidth: 0 // This prevents flex items from growing beyond their container
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Markdown Output
          </Typography>
          <ToggleButtonGroup
            value={outputView}
            exclusive
            onChange={(_, value) => value && handleViewChange(value, false)}
            size="small"
          >
            <ToggleButton value="code">Code</ToggleButton>
            <ToggleButton value="preview">Preview</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        {error ? (
          <Box sx={{ 
            p: 2, 
            backgroundColor: '#ffebee', 
            color: '#c62828', 
            borderRadius: 1,
            mb: 2
          }}>
            {error}
          </Box>
        ) : null}
        <Box sx={{ 
          flex: 1, 
          minHeight: 0, 
          overflow: 'hidden',
          position: 'relative'
        }}>
          {renderOutputContent()}
        </Box>
      </Paper>
    </Box>
  );
};