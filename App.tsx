import React, { useState, useEffect } from 'react';
import type { Solution } from './types';
import { solveProblemFromFile, generateSimilarProblems, solveProblemFromText } from './services/geminiService';
import { UploadIcon } from './components/icons/UploadIcon';
import { EyeIcon, EyeSlashIcon } from './components/icons/VisibilityIcons';
import { Spinner } from './components/Spinner';
import { MathRenderer } from './components/MathRenderer';

const App: React.FC = () => {
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [originalSolution, setOriginalSolution] = useState<Solution | null>(null);
    const [originalProblemText, setOriginalProblemText] = useState<string>('');
    const [problemCount, setProblemCount] = useState<number>(1);
    
    // Manual input for number of similar problems
    const [manualProblemCount, setManualProblemCount] = useState<number>(1);
    
    // Visibility state for original solution
    const [showOriginalSolution, setShowOriginalSolution] = useState<boolean>(false);
    
    const [similarProblems, setSimilarProblems] = useState<string[]>([]);
    // Change to accept null for unsolved problems
    const [similarSolutions, setSimilarSolutions] = useState<(Solution | null)[]>([]);
    
    // Visibility state for similar solutions (set of indices)
    const [expandedSimilarSolutions, setExpandedSimilarSolutions] = useState<Set<number>>(new Set());

    const [isLoadingOriginal, setIsLoadingOriginal] = useState<boolean>(false);
    const [isLoadingSimilarProblems, setIsLoadingSimilarProblems] = useState<boolean>(false);
    // Track loading state for specific similar problem index
    const [loadingSimilarSolutionIndex, setLoadingSimilarSolutionIndex] = useState<number | null>(null);
    
    const [error, setError] = useState<string | null>(null);

    // Sync manual count when detected count changes
    useEffect(() => {
        setManualProblemCount(problemCount);
    }, [problemCount]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Reset states on new file upload
            setOriginalFile(file);
            setOriginalSolution(null);
            setOriginalProblemText('');
            setProblemCount(1);
            setManualProblemCount(1);
            setShowOriginalSolution(false); // Default to hidden
            setSimilarProblems([]);
            setSimilarSolutions([]);
            setExpandedSimilarSolutions(new Set());
            setError(null);
            
            const reader = new FileReader();
            reader.onloadend = () => {
                setFilePreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            handleSolveOriginal(file);
        }
    };

    const handleSolveOriginal = async (file: File) => {
        setIsLoadingOriginal(true);
        setError(null);
        try {
            const result = await solveProblemFromFile(file);
            setOriginalProblemText(result.problemText);
            setOriginalSolution(result.solution);
            setProblemCount(result.problemCount || 1);
        } catch (err) {
            setError('Đã xảy ra lỗi khi giải bài toán. Vui lòng thử lại.');
            console.error(err);
        } finally {
            setIsLoadingOriginal(false);
        }
    };
    
    const handleGenerateSimilar = async () => {
        if (!originalProblemText) {
            setError('Cần phải giải bài toán gốc trước khi tạo bài tương tự.');
            return;
        }
        if (manualProblemCount < 1 || manualProblemCount > 20) {
            setError('Vui lòng nhập số lượng bài toán từ 1 đến 20.');
            return;
        }

        setIsLoadingSimilarProblems(true);
        setError(null);
        setSimilarProblems([]);
        setSimilarSolutions([]);
        setExpandedSimilarSolutions(new Set());
        try {
            const result = await generateSimilarProblems(originalProblemText, manualProblemCount);
            setSimilarProblems(result.problems);
            // Initialize solutions array with nulls
            setSimilarSolutions(new Array(result.problems.length).fill(null));
        } catch (err) {
            setError('Đã xảy ra lỗi khi tạo bài toán tương tự.');
            console.error(err);
        } finally {
            setIsLoadingSimilarProblems(false);
        }
    };

    const handleSolveSingleSimilar = async (index: number) => {
        const problemText = similarProblems[index];
        if (!problemText) return;

        setLoadingSimilarSolutionIndex(index);
        setError(null);

        try {
            const result = await solveProblemFromText(problemText);
            
            setSimilarSolutions(prev => {
                const newSolutions = [...prev];
                newSolutions[index] = result.solution;
                return newSolutions;
            });
            
            // Auto expand the solution after solving
            setExpandedSimilarSolutions(prev => new Set(prev).add(index));

        } catch (err) {
            setError(`Đã xảy ra lỗi khi giải bài toán số ${index + 1}.`);
            console.error(err);
        } finally {
            setLoadingSimilarSolutionIndex(null);
        }
    };

    const toggleSimilarSolution = (index: number) => {
        const newSet = new Set(expandedSimilarSolutions);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        setExpandedSimilarSolutions(newSet);
    };

    const Panel: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
        <div className={`bg-white rounded-2xl shadow-lg p-6 flex flex-col ${className}`}>
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2">{title}</h2>
            <div className="flex-grow overflow-y-auto custom-scrollbar">
                {children}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-4 lg:p-8 font-sans">
            <header className="text-center mb-8">
                <h1 className="text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-800">
                    Trợ Lý Toán Học THCS
                </h1>
                <p className="text-gray-600 mt-2 text-lg">Giải bài tập và tạo đề tương tự cho học sinh lớp 6 - 9</p>
            </header>
            
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
                    <strong className="font-bold">Lỗi!</strong>
                    <span className="block sm:inline ml-2">{error}</span>
                </div>
            )}

            <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Panel 1: Upload */}
                <Panel title="1. Tải Lên Đề Bài">
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <label htmlFor="file-upload" className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col justify-center items-center cursor-pointer hover:border-blue-500 hover:bg-gray-50 transition-colors">
                            {filePreview ? (
                                <img src={filePreview} alt="Xem trước đề bài" className="max-h-full max-w-full object-contain p-2"/>
                            ) : (
                                <>
                                    <UploadIcon />
                                    <p className="mt-2 text-gray-600">Kéo & thả hoặc <span className="font-semibold text-blue-600">nhấn để chọn file</span></p>
                                    <p className="text-xs text-gray-500 mt-1">Hỗ trợ file ảnh (PNG, JPG, WEBP)</p>
                                </>
                            )}
                        </label>
                        <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                </Panel>

                {/* Panel 2: Original Solution -> Renamed to Content */}
                <Panel title="2. Nội Dung Đề Bài (Word)">
                    {isLoadingOriginal ? <Spinner text="AI đang phân tích và giải bài..."/> : (
                        originalSolution ? (
                            <div>
                                <h3 className="font-semibold text-gray-700 mb-2">Đề bài trích xuất từ ảnh:</h3>
                                <MathRenderer 
                                    content={originalProblemText} 
                                    className="bg-gray-100 p-4 rounded-md mb-4 text-gray-800 whitespace-pre-wrap border border-gray-200"
                                />
                                
                                <div className="flex justify-end mb-4">
                                    <button 
                                        onClick={() => setShowOriginalSolution(!showOriginalSolution)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm ${
                                            showOriginalSolution 
                                            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                                            : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
                                        }`}
                                    >
                                        {showOriginalSolution ? (
                                            <>
                                                <EyeSlashIcon className="w-5 h-5" />
                                                Ẩn lời giải
                                            </>
                                        ) : (
                                            <>
                                                <EyeIcon className="w-5 h-5" />
                                                Xem lời giải chi tiết
                                            </>
                                        )}
                                    </button>
                                </div>

                                {showOriginalSolution && (
                                    <div className="animate-in fade-in slide-in-from-top-4 duration-300 bg-green-50 p-4 rounded-xl border border-green-100">
                                        <h3 className="font-semibold text-green-800 mb-2">Các bước giải:</h3>
                                        <MathRenderer 
                                            isHtml 
                                            content={originalSolution.steps.replace(/\n/g, '<br />')}
                                            className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-800"
                                        />
                                        {originalSolution.svg && (
                                            <div className="mt-4 border-t border-green-200 pt-4">
                                                <h3 className="font-semibold text-green-800 mb-2">Hình vẽ minh họa:</h3>
                                                <div className="flex justify-center items-center bg-white p-2 rounded-md shadow-sm" dangerouslySetInnerHTML={{ __html: originalSolution.svg }} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 italic">
                                Nội dung đề bài và lời giải sẽ xuất hiện ở đây sau khi bạn tải ảnh lên.
                            </div>
                        )
                    )}
                </Panel>

                {/* Panel 3: Generate Similar */}
                <Panel title="3. Tạo Đề Bài Tương Tự">
                     {isLoadingSimilarProblems ? <Spinner text={`AI đang soạn ${manualProblemCount} đề bài mới...`}/> : (
                        similarProblems.length > 0 ? (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-gray-600 text-sm">Đã tạo <span className="font-bold">{similarProblems.length}</span> đề bài.</p>
                                    <button 
                                        onClick={() => setSimilarProblems([])}
                                        className="text-sm text-blue-600 hover:underline"
                                    >
                                        Tạo lại bộ khác
                                    </button>
                                </div>
                                {similarProblems.map((problem, index) => (
                                    <div key={index} className="mb-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                             <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded uppercase">Bài {index + 1}</span>
                                        </div>
                                        <MathRenderer 
                                            content={problem}
                                            className="text-gray-800 mt-1 whitespace-pre-wrap"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center h-full space-y-6">
                                {originalSolution ? (
                                    <div className="w-full max-w-sm">
                                        <p className="text-gray-600 mb-4 text-center">
                                            AI phát hiện <span className="font-bold text-blue-600">{problemCount}</span> bài tập trong ảnh gốc.
                                            Bạn muốn tạo bao nhiêu bài tương tự?
                                        </p>
                                        
                                        <div className="flex items-center space-x-2 mb-4">
                                            <label className="text-gray-700 font-medium whitespace-nowrap">Số lượng:</label>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                max="10" 
                                                value={manualProblemCount} 
                                                onChange={(e) => setManualProblemCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-center font-bold text-lg"
                                            />
                                        </div>

                                        <button
                                            onClick={handleGenerateSimilar}
                                            className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                            </svg>
                                            Tạo Đề Tương Tự
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic">Vui lòng tải lên và giải đề bài gốc trước.</p>
                                )}
                            </div>
                        )
                     )}
                </Panel>

                {/* Panel 4: Similar Solutions - Updated to Allow Selection */}
                <Panel title="4. Lời Giải Cho Đề Tương Tự">
                    {similarProblems.length > 0 ? (
                        <div className="space-y-6">
                            <p className="text-gray-600 text-sm mb-2 italic">Chọn bài tập bạn muốn xem lời giải:</p>
                            {similarProblems.map((_, index) => {
                                const solution = similarSolutions[index];
                                const isExpanded = expandedSimilarSolutions.has(index);
                                const isSolving = loadingSimilarSolutionIndex === index;

                                return (
                                    <div key={index} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-bold text-gray-800">Bài toán số {index + 1}</h3>
                                            
                                            {solution ? (
                                                <button
                                                    onClick={() => toggleSimilarSolution(index)}
                                                    className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg"
                                                >
                                                    {isExpanded ? (
                                                        <> <EyeSlashIcon className="w-4 h-4"/> Ẩn giải </>
                                                    ) : (
                                                        <> <EyeIcon className="w-4 h-4"/> Xem giải </>
                                                    )}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleSolveSingleSimilar(index)}
                                                    disabled={isSolving || loadingSimilarSolutionIndex !== null}
                                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold text-white transition-all ${
                                                        isSolving 
                                                        ? 'bg-gray-400 cursor-not-allowed' 
                                                        : 'bg-green-500 hover:bg-green-600 shadow-md hover:shadow-lg'
                                                    } ${loadingSimilarSolutionIndex !== null && !isSolving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {isSolving ? (
                                                        <>
                                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Đang giải...
                                                        </>
                                                    ) : (
                                                        "Giải bài này"
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        
                                        {solution && isExpanded && (
                                            <div className="animate-in fade-in slide-in-from-top-2 duration-200 mt-3 pt-3 border-t border-gray-100">
                                                <MathRenderer 
                                                    isHtml
                                                    content={solution.steps.replace(/\n/g, '<br />')}
                                                    className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700"
                                                />
                                                {solution.svg && (
                                                    <div className="mt-4 border-t pt-4">
                                                        <h4 className="font-semibold text-gray-700 mb-2 text-sm">Hình vẽ minh họa:</h4>
                                                        <div className="flex justify-center items-center bg-gray-50 p-2 rounded-md border border-gray-200" dangerouslySetInnerHTML={{ __html: solution.svg }} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center h-full text-center p-6">
                             <div className="bg-gray-100 p-4 rounded-full mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                             </div>
                            <p className="text-gray-500">Hãy tạo đề bài tương tự ở mục 3 trước khi xem lời giải tại đây.</p>
                        </div>
                    )}
                </Panel>
            </main>
             <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
            `}</style>
        </div>
    );
};

export default App;