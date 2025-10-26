import React, { useState } from 'react';
import {
  DocumentIcon,
  PlusIcon,
  ScissorsIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  DocumentPlusIcon,
  CheckIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import Threads from './Threads';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export default function PDFToolkit() {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentView, setCurrentView] = useState('landing'); // 'landing', 'merge', 'split'
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [splitPages, setSplitPages] = useState([]);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Generate page thumbnails
  const generatePageThumbnails = async (arrayBuffer, fileName, pdfId) => {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      const pagesList = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        pagesList.push({
          id: `${pdfId}-page-${i}`,
          pdfId: pdfId,
          pageNumber: i,
          fileName: fileName,
          thumbnail: canvas.toDataURL(),
          totalPages: numPages,
        });
      }

      return pagesList;
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      return [];
    }
  };

  // Handle PDF file upload
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    const newPdfFiles = [];

    setIsProcessing(true);

    for (const file of files) {
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pageCount = pdfDoc.getPageCount();
        const pdfId = Date.now() + Math.random();

        newPdfFiles.push({
          id: pdfId,
          name: file.name,
          file: file,
          pdfDoc: pdfDoc,
          pageCount: pageCount,
          arrayBuffer: arrayBuffer,
        });
      }
    }

    setPdfFiles([...pdfFiles, ...newPdfFiles]);
    setIsProcessing(false);
  };

  // Load pages for split view
  const loadPagesForSplit = async (pdfFile) => {
    setIsProcessing(true);
    const pages = await generatePageThumbnails(pdfFile.arrayBuffer, pdfFile.name, pdfFile.id);
    setSplitPages(pages);
    setSelectedPages(new Set());
    setIsProcessing(false);
  };

  // Toggle page selection
  const togglePageSelection = (pageId) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageId)) {
      newSelected.delete(pageId);
    } else {
      newSelected.add(pageId);
    }
    setSelectedPages(newSelected);
  };

  // Select range of pages
  const selectPageRange = () => {
    if (!rangeStart || !rangeEnd) return;
    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);

    if (start > 0 && end <= splitPages.length && start <= end) {
      const newSelected = new Set(selectedPages);
      for (let i = start; i <= end; i++) {
        newSelected.add(splitPages[i - 1].id);
      }
      setSelectedPages(newSelected);
    }
  };

  // Select all pages
  const selectAllPages = () => {
    setSelectedPages(new Set(splitPages.map(p => p.id)));
  };

  // Deselect all pages
  const deselectAllPages = () => {
    setSelectedPages(new Set());
  };

  // Delete selected pages
  const deleteSelectedPages = () => {
    const newPages = splitPages.filter(page => !selectedPages.has(page.id));
    setSplitPages(newPages);
    setSelectedPages(new Set());
  };

  // Download selected pages as separate PDFs
  const downloadSelectedPages = async () => {
    if (selectedPages.size === 0) return;

    setIsProcessing(true);
    try {
      const pdfFile = pdfFiles.find(pdf => pdf.id === splitPages[0].pdfId);
      const freshArrayBuffer = await pdfFile.file.arrayBuffer();
      const pdf = await PDFDocument.load(freshArrayBuffer);

      for (const page of splitPages) {
        if (selectedPages.has(page.id)) {
          const newPdf = await PDFDocument.create();
          const [copiedPage] = await newPdf.copyPages(pdf, [page.pageNumber - 1]);
          newPdf.addPage(copiedPage);

          const pdfBytes = await newPdf.save();
          const fileName = `${pdfFile.name.replace('.pdf', '')}_page_${page.pageNumber}.pdf`;
          downloadPDF(pdfBytes, fileName);
        }
      }
    } catch (error) {
      console.error('Error downloading pages:', error);
      alert('Error downloading pages: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download selected pages as one combined PDF
  const downloadSelectedAsOnePDF = async () => {
    if (selectedPages.size === 0) return;

    setIsProcessing(true);
    try {
      const newPdf = await PDFDocument.create();
      const pdfFile = pdfFiles.find(pdf => pdf.id === splitPages[0].pdfId);
      const freshArrayBuffer = await pdfFile.file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(freshArrayBuffer);

      // Add only selected pages in their current order
      for (const page of splitPages) {
        if (selectedPages.has(page.id)) {
          const [copiedPage] = await newPdf.copyPages(sourcePdf, [page.pageNumber - 1]);
          newPdf.addPage(copiedPage);
        }
      }

      const pdfBytes = await newPdf.save();
      downloadPDF(pdfBytes, `${pdfFile.name.replace('.pdf', '')}_selected.pdf`);
    } catch (error) {
      console.error('Error creating PDF:', error);
      alert('Error creating PDF: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download all current pages as one PDF
  const downloadAllPagesAsPDF = async () => {
    if (splitPages.length === 0) return;

    setIsProcessing(true);
    try {
      const newPdf = await PDFDocument.create();
      const pdfFile = pdfFiles.find(pdf => pdf.id === splitPages[0].pdfId);
      const freshArrayBuffer = await pdfFile.file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(freshArrayBuffer);

      for (const page of splitPages) {
        const [copiedPage] = await newPdf.copyPages(sourcePdf, [page.pageNumber - 1]);
        newPdf.addPage(copiedPage);
      }

      const pdfBytes = await newPdf.save();
      downloadPDF(pdfBytes, 'edited_' + pdfFile.name);
    } catch (error) {
      console.error('Error creating PDF:', error);
      alert('Error creating PDF: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Smooth drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      e.target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (index) => {
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    const newPages = [...splitPages];
    const draggedPage = newPages[draggedIndex];

    // Remove from old position
    newPages.splice(draggedIndex, 1);
    // Insert at new position
    newPages.splice(dropIndex, 0, draggedPage);

    setSplitPages(newPages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Merge all PDFs
  const mergePDFs = async () => {
    if (pdfFiles.length === 0) return;

    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const pdfFile of pdfFiles) {
        const freshArrayBuffer = await pdfFile.file.arrayBuffer();
        const pdf = await PDFDocument.load(freshArrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      }

      const pdfBytes = await mergedPdf.save();
      downloadPDF(pdfBytes, 'merged.pdf');
    } catch (error) {
      console.error('Error merging PDFs:', error);
      alert('Error merging PDFs: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete a PDF file
  const deletePDF = (id) => {
    setPdfFiles(pdfFiles.filter((pdf) => pdf.id !== id));
  };

  // Download PDF
  const downloadPDF = (pdfBytes, fileName) => {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Clear all and go back to landing
  const goBackToLanding = () => {
    setPdfFiles([]);
    setSplitPages([]);
    setSelectedPages(new Set());
    setCurrentView('landing');
  };

  return (
    <div className="min-h-screen bg-[#333446] relative flex flex-col">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <Threads
          color={[0.72, 0.81, 0.81]}
          amplitude={1}
          distance={0}
          enableMouseInteraction={true}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-[#333446]/80 backdrop-blur-sm border-b border-[#7F8CAA]/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#B8CFCE] rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#333446]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-[#EAEFEF]">NeatPDF</h1>
              </div>
              {currentView !== 'landing' && (
                <button
                  onClick={goBackToLanding}
                  className="flex items-center gap-2 px-4 py-2 bg-[#7F8CAA]/20 hover:bg-[#7F8CAA]/30 text-[#EAEFEF] rounded-lg transition-all"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back to Home
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          {currentView === 'landing' && (
            <div className="max-w-4xl w-full">
              <div className="text-center mb-12">
                <h2 className="text-5xl font-bold text-[#EAEFEF] mb-4">
                  PDF Tools
                </h2>
                <p className="text-lg text-[#B8CFCE]">
                  Choose what you'd like to do with your PDFs
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Merge PDFs Card */}
                <button
                  onClick={() => setCurrentView('merge')}
                  className="group bg-[#7F8CAA]/10 hover:bg-[#7F8CAA]/20 border-2 border-[#7F8CAA]/30 hover:border-[#B8CFCE] rounded-2xl p-8 transition-all duration-300 text-left"
                >
                  <div className="w-16 h-16 bg-[#B8CFCE] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <DocumentPlusIcon className="w-8 h-8 text-[#333446]" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#EAEFEF] mb-3">Merge PDFs</h3>
                  <p className="text-[#B8CFCE]">
                    Combine multiple PDF files into a single document
                  </p>
                </button>

                {/* Split & Edit PDFs Card */}
                <button
                  onClick={() => setCurrentView('split')}
                  className="group bg-[#7F8CAA]/10 hover:bg-[#7F8CAA]/20 border-2 border-[#7F8CAA]/30 hover:border-[#B8CFCE] rounded-2xl p-8 transition-all duration-300 text-left"
                >
                  <div className="w-16 h-16 bg-[#B8CFCE] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <ScissorsIcon className="w-8 h-8 text-[#333446]" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#EAEFEF] mb-3">Split & Edit</h3>
                  <p className="text-[#B8CFCE]">
                    Reorder, delete, and extract pages from your PDFs
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Merge PDFs View */}
          {currentView === 'merge' && (
            <div className="max-w-4xl w-full">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-[#EAEFEF] mb-3">
                  Merge PDFs
                </h2>
                <p className="text-sm text-[#B8CFCE]">
                  Upload multiple PDFs to combine them
                </p>
              </div>

              {/* Upload Area */}
              <div className="mb-8">
                <label className="block w-full">
                  <div className="border-2 border-dashed border-[#7F8CAA] rounded-2xl p-12 text-center hover:border-[#B8CFCE] transition-all cursor-pointer bg-[#7F8CAA]/5">
                    <PlusIcon className="w-12 h-12 text-[#B8CFCE] mx-auto mb-4" />
                    <p className="text-lg font-semibold text-[#EAEFEF] mb-2">
                      Click to upload PDF files
                    </p>
                    <p className="text-sm text-[#B8CFCE]">
                      Or drag and drop PDF files here
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </label>
              </div>

              {pdfFiles.length > 0 && (
                <div className="bg-[#7F8CAA]/10 rounded-2xl border border-[#7F8CAA]/30 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[#EAEFEF]">
                      Uploaded PDFs ({pdfFiles.length})
                    </h3>
                    <button
                      onClick={goBackToLanding}
                      className="text-sm text-[#B8CFCE] hover:text-[#EAEFEF]"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="space-y-3 mb-6">
                    {pdfFiles.map((pdf) => (
                      <div
                        key={pdf.id}
                        className="flex items-center justify-between p-4 bg-[#333446] rounded-xl border border-[#7F8CAA]/20"
                      >
                        <div className="flex items-center gap-3">
                          <DocumentIcon className="w-5 h-5 text-[#B8CFCE]" />
                          <div>
                            <p className="text-[#EAEFEF] font-medium">{pdf.name}</p>
                            <p className="text-xs text-[#7F8CAA]">
                              {pdf.pageCount} pages
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => deletePDF(pdf.id)}
                          className="p-2 text-[#7F8CAA] hover:text-red-400 transition-all"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={mergePDFs}
                    disabled={isProcessing || pdfFiles.length < 2}
                    className="w-full px-6 py-3 bg-[#B8CFCE] text-[#333446] font-semibold rounded-xl hover:bg-[#EAEFEF] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-3 border-[#333446] border-t-transparent rounded-full animate-spin" />
                        Merging...
                      </>
                    ) : (
                      <>
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        Merge & Download
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Split & Edit View */}
          {currentView === 'split' && (
            <div className="max-w-7xl w-full">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-[#EAEFEF] mb-3">
                  Split & Edit PDF
                </h2>
                <p className="text-sm text-[#B8CFCE]">
                  Upload a PDF to edit its pages
                </p>
              </div>

              {splitPages.length === 0 ? (
                // PDF Selection or Upload
                <>
                  <div className="mb-8">
                    <label className="block w-full">
                      <div className="border-2 border-dashed border-[#7F8CAA] rounded-2xl p-12 text-center hover:border-[#B8CFCE] transition-all cursor-pointer bg-[#7F8CAA]/5">
                        <PlusIcon className="w-12 h-12 text-[#B8CFCE] mx-auto mb-4" />
                        <p className="text-lg font-semibold text-[#EAEFEF] mb-2">
                          Click to upload a PDF file
                        </p>
                        <p className="text-sm text-[#B8CFCE]">
                          Or drag and drop a PDF file here
                        </p>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                    </label>
                  </div>

                  {pdfFiles.length > 0 && (
                    <div className="bg-[#7F8CAA]/10 rounded-2xl border border-[#7F8CAA]/30 p-6">
                      <h3 className="text-lg font-semibold text-[#EAEFEF] mb-4">
                        Select PDF to Edit
                      </h3>
                      <div className="space-y-3">
                        {pdfFiles.map((pdf) => (
                          <div
                            key={pdf.id}
                            className="flex items-center justify-between p-4 bg-[#333446] rounded-xl border border-[#7F8CAA]/20"
                          >
                            <div className="flex items-center gap-3">
                              <DocumentIcon className="w-5 h-5 text-[#B8CFCE]" />
                              <div>
                                <p className="text-[#EAEFEF] font-medium">{pdf.name}</p>
                                <p className="text-xs text-[#7F8CAA]">
                                  {pdf.pageCount} pages
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => loadPagesForSplit(pdf)}
                              disabled={isProcessing}
                              className="px-4 py-2 bg-[#B8CFCE] text-[#333446] text-sm font-semibold rounded-lg hover:bg-[#EAEFEF] transition-all disabled:opacity-50"
                            >
                              {isProcessing ? 'Loading...' : 'Edit Pages'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // Page Editor View
                <div className="space-y-6">
                  {/* Toolbar */}
                  <div className="bg-[#7F8CAA]/10 rounded-xl border border-[#7F8CAA]/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <span className="text-[#B8CFCE]">Total: </span>
                          <span className="text-[#EAEFEF] font-semibold">{splitPages.length} pages</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-[#B8CFCE]">Selected: </span>
                          <span className="text-[#B8CFCE] font-semibold">{selectedPages.size} pages</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={selectAllPages}
                          className="px-3 py-1.5 text-xs bg-[#7F8CAA]/20 text-[#EAEFEF] hover:bg-[#7F8CAA]/30 rounded-lg transition-all"
                        >
                          Select All
                        </button>
                        <button
                          onClick={deselectAllPages}
                          className="px-3 py-1.5 text-xs bg-[#7F8CAA]/20 text-[#EAEFEF] hover:bg-[#7F8CAA]/30 rounded-lg transition-all"
                        >
                          Deselect All
                        </button>
                        <button
                          onClick={deleteSelectedPages}
                          disabled={selectedPages.size === 0}
                          className="px-3 py-1.5 text-xs bg-red-600/80 text-white hover:bg-red-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
                        >
                          <TrashIcon className="w-3 h-3" />
                          Delete Selected
                        </button>
                      </div>
                    </div>

                    {/* Range Selection */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#7F8CAA]/20">
                      <span className="text-sm text-[#B8CFCE]">Select range:</span>
                      <input
                        type="number"
                        placeholder="From"
                        value={rangeStart}
                        onChange={(e) => setRangeStart(e.target.value)}
                        min="1"
                        max={splitPages.length}
                        className="w-20 px-2 py-1 text-sm bg-[#333446] border border-[#7F8CAA]/30 rounded text-[#EAEFEF] focus:ring-2 focus:ring-[#B8CFCE] focus:border-transparent"
                      />
                      <span className="text-[#B8CFCE]">to</span>
                      <input
                        type="number"
                        placeholder="To"
                        value={rangeEnd}
                        onChange={(e) => setRangeEnd(e.target.value)}
                        min="1"
                        max={splitPages.length}
                        className="w-20 px-2 py-1 text-sm bg-[#333446] border border-[#7F8CAA]/30 rounded text-[#EAEFEF] focus:ring-2 focus:ring-[#B8CFCE] focus:border-transparent"
                      />
                      <button
                        onClick={selectPageRange}
                        className="px-3 py-1 text-xs bg-[#B8CFCE] text-[#333446] hover:bg-[#EAEFEF] rounded-lg transition-all"
                      >
                        Select Range
                      </button>
                    </div>
                  </div>

                  {/* Page Grid */}
                  <div className="bg-[#7F8CAA]/10 rounded-2xl border border-[#7F8CAA]/30 p-6">
                    <div className="mb-4 text-sm text-[#B8CFCE] text-center">
                      Drag and drop pages to reorder • Click to select/deselect
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {splitPages.map((page, index) => (
                        <div
                          key={page.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDragEnter={() => handleDragEnter(index)}
                          onDrop={(e) => handleDrop(e, index)}
                          className={`relative group bg-[#333446] rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                            selectedPages.has(page.id)
                              ? 'border-[#B8CFCE] ring-2 ring-[#B8CFCE]/50 shadow-lg shadow-[#B8CFCE]/20'
                              : 'border-[#7F8CAA]/30 hover:border-[#7F8CAA]/50'
                          } ${
                            draggedIndex === index ? 'opacity-40 scale-95' : ''
                          } ${
                            dragOverIndex === index ? 'scale-105 border-[#B8CFCE]' : ''
                          }`}
                        >
                          {/* Thumbnail */}
                          <div className="aspect-[3/4] relative">
                            <img
                              src={page.thumbnail}
                              alt={`Page ${page.pageNumber}`}
                              className="w-full h-full object-contain bg-white select-none"
                              draggable="false"
                            />

                            {/* Selection Overlay */}
                            <button
                              onClick={() => togglePageSelection(page.id)}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-all cursor-pointer border-0 p-0 w-full h-full"
                            >
                              {selectedPages.has(page.id) && (
                                <div className="absolute top-2 right-2 w-6 h-6 bg-[#B8CFCE] rounded-full flex items-center justify-center shadow-lg">
                                  <CheckIcon className="w-4 h-4 text-[#333446]" />
                                </div>
                              )}
                            </button>

                            {/* Drag indicator */}
                            {draggedIndex === index && (
                              <div className="absolute inset-0 bg-[#B8CFCE]/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                                <div className="text-[#333446] text-sm font-semibold bg-[#B8CFCE] px-3 py-1 rounded-full">
                                  Dragging...
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Page Number */}
                          <div className="p-2 bg-[#333446]">
                            <p className="text-xs text-center text-[#EAEFEF] font-medium">
                              {page.pageNumber}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={() => {
                        setSplitPages([]);
                        setSelectedPages(new Set());
                      }}
                      className="px-6 py-3 bg-[#7F8CAA]/20 text-[#EAEFEF] font-semibold rounded-xl hover:bg-[#7F8CAA]/30 transition-all"
                    >
                      ← Back to PDFs
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={downloadSelectedPages}
                        disabled={isProcessing || selectedPages.size === 0}
                        className="px-6 py-3 bg-[#7F8CAA]/40 text-[#EAEFEF] font-semibold rounded-xl hover:bg-[#7F8CAA]/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        Download Separate ({selectedPages.size})
                      </button>

                      <button
                        onClick={downloadSelectedAsOnePDF}
                        disabled={isProcessing || selectedPages.size === 0}
                        className="px-6 py-3 bg-green-500/90 text-white font-semibold rounded-xl hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        Download Selected as PDF
                      </button>

                      <button
                        onClick={downloadAllPagesAsPDF}
                        disabled={isProcessing || splitPages.length === 0}
                        className="px-6 py-3 bg-[#B8CFCE] text-[#333446] font-semibold rounded-xl hover:bg-[#EAEFEF] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        Download All as PDF
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-[#333446]/80 backdrop-blur-sm border-t border-[#7F8CAA]/30 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <p className="text-center text-xs text-[#7F8CAA] mb-2">
              All files are processed locally in your browser
            </p>
            <p className="text-center text-xs text-[#B8CFCE]">
              Made with ❤️ by Aarush
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
