import React from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import { ConversionOptions } from '../utils/converter';

interface OptionsPanelProps {
  options: ConversionOptions;
  onOptionsChange: (options: ConversionOptions) => void;
}

export const OptionsPanel: React.FC<OptionsPanelProps> = ({ options, onOptionsChange }) => {
  const handleChange = (key: keyof ConversionOptions, value: any) => {
    onOptionsChange({
      ...options,
      [key]: value,
    });
  };

  const handleMacroChange = (macroType: keyof ConversionOptions['macroHandling'], value: any) => {
    onOptionsChange({
      ...options,
      macroHandling: {
        ...options.macroHandling,
        [macroType]: value,
      },
    });
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Conversion Options
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel>Panel Style</InputLabel>
          <Select
            value={options.panelStyle}
            label="Panel Style"
            onChange={(e) => handleChange('panelStyle', e.target.value)}
          >
            <MenuItem value="blockquote">Blockquote</MenuItem>
            <MenuItem value="div">Div</MenuItem>
            <MenuItem value="section">Section</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Table Style</InputLabel>
          <Select
            value={options.tableStyle}
            label="Table Style"
            onChange={(e) => handleChange('tableStyle', e.target.value)}
          >
            <MenuItem value="github">GitHub</MenuItem>
            <MenuItem value="simple">Simple</MenuItem>
            <MenuItem value="html">HTML</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Code Block Style</InputLabel>
          <Select
            value={options.codeBlockStyle}
            label="Code Block Style"
            onChange={(e) => handleChange('codeBlockStyle', e.target.value)}
          >
            <MenuItem value="fenced">Fenced</MenuItem>
            <MenuItem value="indented">Indented</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Image Style</InputLabel>
          <Select
            value={options.imageStyle}
            label="Image Style"
            onChange={(e) => handleChange('imageStyle', e.target.value)}
          >
            <MenuItem value="markdown">Markdown</MenuItem>
            <MenuItem value="html">HTML</MenuItem>
          </Select>
        </FormControl>

        <Divider sx={{ my: 1 }} />
        <Typography variant="subtitle1" gutterBottom>
          Macro Handling
        </Typography>

        <FormControl fullWidth>
          <InputLabel>Info Macro</InputLabel>
          <Select
            value={options.macroHandling.info}
            label="Info Macro"
            onChange={(e) => handleMacroChange('info', e.target.value)}
          >
            <MenuItem value="blockquote">Blockquote</MenuItem>
            <MenuItem value="div">Div</MenuItem>
            <MenuItem value="section">Section</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Warning Macro</InputLabel>
          <Select
            value={options.macroHandling.warning}
            label="Warning Macro"
            onChange={(e) => handleMacroChange('warning', e.target.value)}
          >
            <MenuItem value="blockquote">Blockquote</MenuItem>
            <MenuItem value="div">Div</MenuItem>
            <MenuItem value="section">Section</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Note Macro</InputLabel>
          <Select
            value={options.macroHandling.note}
            label="Note Macro"
            onChange={(e) => handleMacroChange('note', e.target.value)}
          >
            <MenuItem value="blockquote">Blockquote</MenuItem>
            <MenuItem value="div">Div</MenuItem>
            <MenuItem value="section">Section</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Code Macro</InputLabel>
          <Select
            value={options.macroHandling.code}
            label="Code Macro"
            onChange={(e) => handleMacroChange('code', e.target.value)}
          >
            <MenuItem value="fenced">Fenced</MenuItem>
            <MenuItem value="indented">Indented</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Paper>
  );
}; 